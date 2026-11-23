use anchor_lang::prelude::*;

declare_id!("GiJaLw42XEU8KiTDb1K3RXn4wT9VKubyypEdpW6KMD6B");


#[error_code]
pub enum CounterError {
    #[msg("Counter overflow")]
    Overflow,

    #[msg("Counter cannot go below zero")]
    Underflow,
}


#[program]
pub mod counter_pda {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count = 0;
        counter.authority = ctx.accounts.authority.key();
        Ok(())
    }
    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count = counter.count.checked_add(1).ok_or(CounterError::Overflow)?;
        Ok(())
    }
    pub fn decrement(ctx: Context<Decrement>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count = counter.count.checked_sub(1).ok_or(CounterError::Underflow)?;
        Ok(())
    }
    pub fn close_counter(_ctx: Context<CloseCounter>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init, 
        payer = authority, 
        space = 8 + 8 + 32, 
        seeds = [b"counter", authority.key().as_ref()], 
        bump
    )]
    pub counter: Account<'info, Counter>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(
        mut, 
        seeds = [b"counter", authority.key().as_ref()], bump, 
        has_one = authority
    )]
    pub counter: Account<'info, Counter>,
    pub authority: Signer<'info>,
}
#[derive(Accounts)]
pub struct Decrement<'info> {
    #[account(
        mut, 
        seeds = [b"counter", authority.key().as_ref()], bump,
        has_one = authority
    )]
    pub counter: Account<'info, Counter>,
    pub authority: Signer<'info>,
}
#[derive(Accounts)]
pub struct CloseCounter<'info> {
    #[account(
        mut, 
        seeds = [b"counter", authority.key().as_ref()], 
        bump,
        has_one = authority,
        close = authority // added close. lamports will be sent to the authority when the account is closed
    )]
    pub counter: Account<'info, Counter>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[account]
pub struct Counter {
    pub count: u64,
    pub authority: Pubkey,
}
