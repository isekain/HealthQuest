module health_quest::mint_config {
    use std::error;
    use std::signer;
    use aptos_framework::event;

    // Mint NFT configuration
    struct MintConfig has key {
        mint_price: u64,
        admin: address,  // Address that can change configuration
        treasury: address, // Address receiving mint payments
    }

    // Event when mint price changes
    #[event]
    struct MintPriceChanged has drop, store {
        old_price: u64,
        new_price: u64,
        changed_by: address,
    }
    
    // Event when admin changes
    #[event]
    struct AdminChanged has drop, store {
        old_admin: address,
        new_admin: address,
    }

    // Error codes
    const ENOT_AUTHORIZED: u64 = 1; // Not authorized
    const ECONFIG_EXISTS: u64 = 2;  // Configuration already exists
    const ECONFIG_NOT_EXISTS: u64 = 3;  // Configuration doesn't exist

    // Helper function to check if config exists
    #[view]
    public fun config_exists(): bool {
        exists<MintConfig>(@health_quest)
    }

    // Initialize configuration
    public entry fun initialize_mint_config(
        account: &signer,
        initial_price: u64,
        treasury: address
    ) {
        let account_addr = signer::address_of(account);
        
        // Check if module has been initialized by this account
        assert!(!exists<MintConfig>(account_addr), error::already_exists(ECONFIG_EXISTS));
        
        // Create configuration
        let config = MintConfig {
            mint_price: initial_price,
            admin: account_addr,
            treasury,
        };
        
        // Save to resource
        move_to(account, config);
    }

    // Update mint price
    public entry fun update_mint_price(
        account: &signer,
        new_price: u64
    ) acquires MintConfig {
        let account_addr = signer::address_of(account);
        let module_addr = @health_quest;
        
        // Check if configuration exists
        assert!(exists<MintConfig>(module_addr), error::not_found(ECONFIG_NOT_EXISTS));
        
        let config = borrow_global_mut<MintConfig>(module_addr);
        
        // Only admin can make changes
        assert!(config.admin == account_addr, error::permission_denied(ENOT_AUTHORIZED));
        
        // Save old price for event
        let old_price = config.mint_price;
        
        // Update to new price
        config.mint_price = new_price;
        
        // Emit event
        event::emit(MintPriceChanged {
            old_price,
            new_price,
            changed_by: account_addr,
        });
    }

    // Get current mint price
    #[view]
    public fun get_mint_price(): u64 acquires MintConfig {
        assert!(exists<MintConfig>(@health_quest), error::not_found(ECONFIG_NOT_EXISTS));
        borrow_global<MintConfig>(@health_quest).mint_price
    }
    
    // Get treasury address
    #[view]
    public fun get_treasury(): address acquires MintConfig {
        assert!(exists<MintConfig>(@health_quest), error::not_found(ECONFIG_NOT_EXISTS));
        borrow_global<MintConfig>(@health_quest).treasury
    }

    // Change admin
    public entry fun change_admin(
        account: &signer,
        new_admin: address
    ) acquires MintConfig {
        let account_addr = signer::address_of(account);
        let module_addr = @health_quest;
        
        let config = borrow_global_mut<MintConfig>(module_addr);
        
        // Only current admin can make changes
        assert!(config.admin == account_addr, error::permission_denied(ENOT_AUTHORIZED));
        
        // Emit event
        event::emit(AdminChanged {
            old_admin: config.admin,
            new_admin,
        });
        
        // Update to new admin
        config.admin = new_admin;
    }
    
    // Change treasury
    public entry fun change_treasury(
        account: &signer,
        new_treasury: address
    ) acquires MintConfig {
        let account_addr = signer::address_of(account);
        let module_addr = @health_quest;
        
        let config = borrow_global_mut<MintConfig>(module_addr);
        
        // Only admin can make changes
        assert!(config.admin == account_addr, error::permission_denied(ENOT_AUTHORIZED));
        
        // Update to new treasury
        config.treasury = new_treasury;
    }
} 