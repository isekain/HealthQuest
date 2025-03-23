module health_quest::nft_mint {
    use std::error;
    use std::signer;
    use std::string::String;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::event;
    
    use health_quest::nft_stats;
    use health_quest::mint_config;

    // Event when NFT is minted
    #[event]
    struct NFTMinted has drop, store {
        owner: address,
        mint_price: u64,
        image_uri: String,
    }

    // Error codes
    const EINSUFFICIENT_FUNDS: u64 = 1; // Insufficient funds
    const EMINT_CONFIG_NOT_INITIALIZED: u64 = 2; // Mint configuration not initialized

    // Mint NFT with custom image
    public entry fun mint_nft(
        account: &signer,
        image_uri: String
    ) {
        let account_addr = signer::address_of(account);
        
        // Check if mint configuration has been initialized using the helper function
        assert!(
            mint_config::config_exists(), 
            error::not_found(EMINT_CONFIG_NOT_INITIALIZED)
        );
        
        // Get mint price and treasury
        let mint_price = mint_config::get_mint_price();
        let treasury = mint_config::get_treasury();
        
        // Check balance
        assert!(
            coin::balance<AptosCoin>(account_addr) >= mint_price, 
            error::invalid_argument(EINSUFFICIENT_FUNDS)
        );
        
        // Transfer to treasury
        if (mint_price > 0) {
            coin::transfer<AptosCoin>(account, treasury, mint_price);
        };
        
        // Initialize NFT Stats with image
        nft_stats::initialize_nft_stats(account, image_uri);
        
        // Emit event
        event::emit(NFTMinted {
            owner: account_addr,
            mint_price,
            image_uri,
        });
    }
} 