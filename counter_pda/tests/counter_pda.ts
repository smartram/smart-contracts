
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { strict as assert } from "assert";
import { CounterPda } from "../target/types/counter_pda";

describe("counter_pda - Day 3", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.CounterPda as Program<CounterPda>;

  const {
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    LAMPORTS_PER_SOL,
  } = anchor.web3;

  // Create a fresh Alice and Counter PDA for each test.
  async function setupCounter() {
    const alice = Keypair.generate();

    const [counterPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("counter"), alice.publicKey.toBuffer()],
      program.programId
    );

    // Fund Alice so she can pay for PDA initialization.
    const fundingTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: alice.publicKey,
        lamports: LAMPORTS_PER_SOL / 10,
      })
    );

    await provider.sendAndConfirm(fundingTx);

    // Initialize Alice's Counter.
    await program.methods
      .initialize()
      .accountsStrict({
        counter: counterPda,
        authority: alice.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([alice])
      .rpc();

    return { alice, counterPda };
  }

  // TEST 1
  it("Initializes Alice's Counter PDA", async () => {
    const { alice, counterPda } = await setupCounter();

    const counter = await program.account.counter.fetch(
      counterPda
    );

    assert.equal(counter.count.toNumber(), 0);
    assert.ok(counter.authority.equals(alice.publicKey));

    console.log("Counter PDA:", counterPda.toBase58());
    console.log("Initial count:", counter.count.toString());
    console.log("Authority:", counter.authority.toBase58());
  });

  // TEST 2
  it("Alice can increment and decrement", async () => {
    const { alice, counterPda } = await setupCounter();

    // Increment twice.
    for (let i = 0; i < 2; i++) {
      await program.methods
        .increment()
        .accountsStrict({
          counter: counterPda,
          authority: alice.publicKey,
        })
        .signers([alice])
        .rpc();
    }

    let counter = await program.account.counter.fetch(
      counterPda
    );

    assert.equal(counter.count.toNumber(), 2);

    // Decrement once.
    await program.methods
      .decrement()
      .accountsStrict({
        counter: counterPda,
        authority: alice.publicKey,
      })
      .signers([alice])
      .rpc();

    counter = await program.account.counter.fetch(counterPda);

    assert.equal(counter.count.toNumber(), 1);

    console.log("Count after increment/decrement:", 1);
  });

  // TEST 3
  it("Rejects Bob incrementing Alice's Counter", async () => {
    const { counterPda } = await setupCounter();

    const bob = Keypair.generate();

    await assert.rejects(
      async () => {
        await program.methods
          .increment()
          .accountsStrict({
            counter: counterPda,
            authority: bob.publicKey,
          })
          .signers([bob])
          .rpc();
      },
      (error: any) => {
        assert.equal(
          error?.error?.errorCode?.code,
          "ConstraintSeeds"
        );
        return true;
      }
    );

    const counter = await program.account.counter.fetch(
      counterPda
    );

    assert.equal(counter.count.toNumber(), 0);
    console.log("Bob's increment rejected");
  });

  // TEST 4
  it("Rejects Bob decrementing Alice's Counter", async () => {
    const { alice, counterPda } = await setupCounter();

    const bob = Keypair.generate();

    // Alice first increments successfully.
    await program.methods
      .increment()
      .accountsStrict({
        counter: counterPda,
        authority: alice.publicKey,
      })
      .signers([alice])
      .rpc();

    await assert.rejects(
      async () => {
        await program.methods
          .decrement()
          .accountsStrict({
            counter: counterPda,
            authority: bob.publicKey,
          })
          .signers([bob])
          .rpc();
      },
      (error: any) => {
        assert.equal(
          error?.error?.errorCode?.code,
          "ConstraintSeeds"
        );
        return true;
      }
    );

    const counter = await program.account.counter.fetch(
      counterPda
    );

    // Bob must not have changed the count.
    assert.equal(counter.count.toNumber(), 1);
    console.log("Bob's decrement rejected");
  });

  // TEST 5
  it("Prevents decrement below zero", async () => {
    const { alice, counterPda } = await setupCounter();

    await assert.rejects(
      async () => {
        await program.methods
          .decrement()
          .accountsStrict({
            counter: counterPda,
            authority: alice.publicKey,
          })
          .signers([alice])
          .rpc();
      },
      (error: any) => {
        assert.equal(
          error?.error?.errorCode?.code,
          "Underflow"
        );
        return true;
      }
    );

    const counter = await program.account.counter.fetch(
      counterPda
    );

    assert.equal(counter.count.toNumber(), 0);
    console.log("Underflow prevented");
  });

  // TEST 6
  it("Rejects a transaction without Alice's signature", async () => {
    const { alice, counterPda } = await setupCounter();

    const bob = Keypair.generate();

    // Alice's public key is supplied,
    // but only Bob signs.
    await assert.rejects(async () => {
      await program.methods
        .increment()
        .accountsStrict({
          counter: counterPda,
          authority: alice.publicKey,
        })
        .signers([bob])
        .rpc();
    });

    const counter = await program.account.counter.fetch(
      counterPda
    );

    assert.equal(counter.count.toNumber(), 0);
    console.log("Missing Alice signature rejected");
  });

it("Alice closes her Counter and receives rent back", async () => {
  const { alice, counterPda } = await setupCounter();

  const rentLamports =
    await provider.connection.getBalance(counterPda);

  const aliceBefore =
    await provider.connection.getBalance(alice.publicKey);

  await program.methods
    .closeCounter()
    .accountsStrict({
      counter: counterPda,
      authority: alice.publicKey,
    })
    .signers([alice])
    .rpc();

  const closedAccount =
    await provider.connection.getAccountInfo(counterPda);

  assert.equal(closedAccount, null);

  const aliceAfter =
    await provider.connection.getBalance(alice.publicKey);

  // Provider wallet pays the transaction fee, not Alice.
  assert.equal(aliceAfter - aliceBefore, rentLamports);

  console.log("Counter PDA closed successfully");
  console.log("Rent returned:", rentLamports, "lamports");
});

it("Rejects Bob closing Alice's Counter", async () => {
  const { counterPda } = await setupCounter();
  const bob = anchor.web3.Keypair.generate();

  const balanceBefore =
    await provider.connection.getBalance(counterPda);

  await assert.rejects(
    async () => {
      await program.methods
        .closeCounter()
        .accountsStrict({
          counter: counterPda,
          authority: bob.publicKey,
        })
        .signers([bob])
        .rpc();
    },
    (error: any) => {
      assert.equal(
        error?.error?.errorCode?.code,
        "ConstraintSeeds"
      );
      return true;
    }
  );

  // Alice's Counter should still exist.
  const counter =
    await program.account.counter.fetch(counterPda);

  assert.equal(counter.count.toNumber(), 0);

  // Its lamports should remain unchanged.
  const balanceAfter =
    await provider.connection.getBalance(counterPda);

  assert.equal(balanceAfter, balanceBefore);
});

});
