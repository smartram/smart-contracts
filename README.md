# Solana Smart Contracts

A collection of Solana smart contracts developed using Rust and the Anchor framework.

This repository documents my hands-on journey of learning Solana program development, including accounts, PDAs, signers, ownership, and cross-program interactions.

## Projects

### 01. Counter Program

A simple on-chain counter built using the Anchor framework.

**Features**
- Initialize a counter account on Solana.
- Store the counter value and authority public key.
- Increment the counter value.
- Learn account initialization, account constraints, and transaction signing.

**Concepts covered**
- Solana accounts and account ownership
- `#[program]` and `#[derive(Accounts)]`
- `Account<'info, T>` and `Signer<'info>`
- System Program
- Account serialization and on-chain state
- Public keys and transaction signatures

**Tech stack**
- Rust 1.89.0
- Anchor 0.32.1
- Solana CLI
- TypeScript (for client interactions and tests)

## Getting Started

### Prerequisites

Install Rust, Solana CLI, Anchor CLI, and Node.js.

### Build the Counter Program

From the repository root:

```bash
cd counter
anchor build
```

### Run Tests

With a localnet test configuration and tests in place:

```bash
anchor test
```

Anchor can automatically start a local validator when configured to do so.

## Learning Roadmap

- [x] Solana account model
- [x] Rust smart contract basics
- [x] Anchor Counter program
- [ ] Local validator testing
- [ ] PDA-based programs
- [ ] SPL token operations
- [ ] Token vault
- [ ] Staking program
- [ ] Escrow program

## Purpose

This repository is for educational purposes and experimentation with Solana smart contract development. The programs are not audited or intended for production use.
