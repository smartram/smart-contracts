
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";
import { Counter } from "../target/types/counter";

describe("counter", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Counter as Program<Counter>;

  // Alice is the configured provider wallet.
  const alice = provider.wallet;

  // New address for Alice's Counter data account.
  const counterKeypair = anchor.web3.Keypair.generate();

  it("1. Initializes Counter", async () => {
    await program.methods
      .initialize()
      .accountsStrict({
        counter: counterKeypair.publicKey,
        authority: alice.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([counterKeypair])
      .rpc();

    const state = await program.account.counter.fetch(
      counterKeypair.publicKey
    );

    console.log("Initial count:", state.count.toString());

    assert.equal(state.count.toNumber(), 0);
    assert.equal(
      state.authority.toBase58(),
      alice.publicKey.toBase58()
    );
  });

  it("2. Increments Counter", async () => {
    await program.methods
      .increment()
      .accountsStrict({
        counter: counterKeypair.publicKey,
        authority: alice.publicKey,
      })
      .rpc();

    const state = await program.account.counter.fetch(
      counterKeypair.publicKey
    );

    console.log("Updated count:", state.count.toString());

    assert.equal(state.count.toNumber(), 1);
  });

  it("3. Rejects Bob's increment", async () => {
    const bob = anchor.web3.Keypair.generate();

    let rejected = false;

    try {
      await program.methods
        .increment()
        .accountsStrict({
          counter: counterKeypair.publicKey,
          authority: bob.publicKey,
        })
        .signers([bob])
        .rpc();
    } catch (error) {
      // Confirm it failed for the authorization reason.
      assert.include(String(error), "ConstraintHasOne");
      rejected = true;
    }

    assert.isTrue(rejected, "Bob's transaction should fail");

    const state = await program.account.counter.fetch(
      counterKeypair.publicKey
    );

    assert.equal(state.count.toNumber(), 1);
  });
});
