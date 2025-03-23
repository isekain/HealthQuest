module health_quest::nft_stats {
    use std::error;
    use std::signer;
    use std::string::{Self, String};
    use aptos_framework::event;
    use aptos_framework::timestamp;

    // Struct storing NFT stats for the user
    struct NFTStats has key {
        // Base stats
        str: u64,       // Strength
        agi: u64,       // Agility
        vit: u64,       // Vitality
        dex: u64,       // Dexterity
        int: u64,       // Intelligence
        wis: u64,       // Wisdom
        luk: u64,       // Luck
        
        // Level and experience info
        level: u64,
        xp: u64,
        xp_to_next_level: u64,
        stats_points: u64,
        
        // Energy info
        energy: u64,
        energy_last_reset: u64, // Unix timestamp
        
        // Image
        image_uri: String,
    }

    // Event when stats change
    #[event]
    struct StatsChanged has drop, store {
        owner: address,
        stat_name: String,
        old_value: u64,
        new_value: u64,
    }

    // Event when user levels up
    #[event]
    struct LevelUp has drop, store {
        owner: address,
        old_level: u64,
        new_level: u64,
        stats_points_gained: u64,
    }
    
    // Event when image changes
    #[event]
    struct ImageChanged has drop, store {
        owner: address,
        old_image: String,
        new_image: String,
    }

    // Error codes
    const ENO_STATS: u64 = 1; // NFT Stats doesn't exist
    const ENOT_ENOUGH_POINTS: u64 = 2; // Not enough stat points
    const ENOT_ENOUGH_ENERGY: u64 = 3; // Not enough energy
    const EINVALID_STAT: u64 = 4; // Invalid stat

    // Initialize NFT Stats when minting NFT
    public entry fun initialize_nft_stats(account: &signer, image_uri: String) {
        let account_addr = signer::address_of(account);
        
        // Check if NFT Stats already exists
        if (exists<NFTStats>(account_addr)) {
            return
        };
        
        // Initialize NFT Stats with default values
        let nft_stats = NFTStats {
            str: 10,
            agi: 10,
            vit: 10,
            dex: 10,
            int: 10,
            wis: 10,
            luk: 10,
            level: 1,
            xp: 0,
            xp_to_next_level: 100,
            stats_points: 0,
            energy: 100,
            energy_last_reset: timestamp::now_seconds(),
            image_uri,
        };
        
        // Save NFT Stats to user account
        move_to(account, nft_stats);
    }

    // Get NFT stats for a user
    #[view]
    public fun get_nft_stats(owner: address): (u64, u64, u64, u64, u64, u64, u64, u64, u64, u64, u64) acquires NFTStats {
        assert!(exists<NFTStats>(owner), error::not_found(ENO_STATS));
        
        let stats = borrow_global<NFTStats>(owner);
        (
            stats.str,
            stats.agi,
            stats.vit,
            stats.dex,
            stats.int,
            stats.wis,
            stats.luk,
            stats.level,
            stats.xp,
            stats.xp_to_next_level,
            stats.stats_points
        )
    }
    
    // Get NFT image information
    #[view]
    public fun get_nft_image(owner: address): String acquires NFTStats {
        assert!(exists<NFTStats>(owner), error::not_found(ENO_STATS));
        
        let stats = borrow_global<NFTStats>(owner);
        stats.image_uri
    }
    
    // Get energy information
    #[view]
    public fun get_energy(owner: address): (u64, u64) acquires NFTStats {
        assert!(exists<NFTStats>(owner), error::not_found(ENO_STATS));
        
        let stats = borrow_global<NFTStats>(owner);
        (stats.energy, stats.energy_last_reset)
    }

    // Increase a stat when allocating stat points
    public entry fun increase_stat(
        account: &signer, 
        stat_name: String,
        amount: u64
    ) acquires NFTStats {
        let account_addr = signer::address_of(account);
        assert!(exists<NFTStats>(account_addr), error::not_found(ENO_STATS));
        
        let stats = borrow_global_mut<NFTStats>(account_addr);
        assert!(stats.stats_points >= amount, error::invalid_argument(ENOT_ENOUGH_POINTS));
        
        // Increase corresponding stat
        if (stat_name == string::utf8(b"STR")) {
            let old_value = stats.str;
            stats.str = stats.str + amount;
            event::emit(StatsChanged {
                owner: account_addr,
                stat_name,
                old_value,
                new_value: stats.str,
            });
        } else if (stat_name == string::utf8(b"AGI")) {
            let old_value = stats.agi;
            stats.agi = stats.agi + amount;
            event::emit(StatsChanged {
                owner: account_addr,
                stat_name,
                old_value,
                new_value: stats.agi,
            });
        } else if (stat_name == string::utf8(b"VIT")) {
            let old_value = stats.vit;
            stats.vit = stats.vit + amount;
            event::emit(StatsChanged {
                owner: account_addr,
                stat_name,
                old_value,
                new_value: stats.vit,
            });
        } else if (stat_name == string::utf8(b"DEX")) {
            let old_value = stats.dex;
            stats.dex = stats.dex + amount;
            event::emit(StatsChanged {
                owner: account_addr,
                stat_name,
                old_value,
                new_value: stats.dex,
            });
        } else if (stat_name == string::utf8(b"INT")) {
            let old_value = stats.int;
            stats.int = stats.int + amount;
            event::emit(StatsChanged {
                owner: account_addr,
                stat_name,
                old_value,
                new_value: stats.int,
            });
        } else if (stat_name == string::utf8(b"WIS")) {
            let old_value = stats.wis;
            stats.wis = stats.wis + amount;
            event::emit(StatsChanged {
                owner: account_addr,
                stat_name,
                old_value,
                new_value: stats.wis,
            });
        } else if (stat_name == string::utf8(b"LUK")) {
            let old_value = stats.luk;
            stats.luk = stats.luk + amount;
            event::emit(StatsChanged {
                owner: account_addr,
                stat_name,
                old_value,
                new_value: stats.luk,
            });
        } else {
            // Invalid stat
            abort error::invalid_argument(EINVALID_STAT)
        };
        
        // Decrease used stat points
        stats.stats_points = stats.stats_points - amount;
    }

    // Add XP for a user and check for level up
    public fun add_experience(owner: address, xp_amount: u64): bool acquires NFTStats {
        assert!(exists<NFTStats>(owner), error::not_found(ENO_STATS));
        
        let stats = borrow_global_mut<NFTStats>(owner);
        let old_level = stats.level;
        
        // Add XP
        stats.xp = stats.xp + xp_amount;
        
        // Check for level up
        let leveled_up = false;
        while (stats.xp >= stats.xp_to_next_level) {
            // Subtract XP for level up
            stats.xp = stats.xp - stats.xp_to_next_level;
            // Increase level
            stats.level = stats.level + 1;
            // Increase XP needed for next level (10% increase per level)
            stats.xp_to_next_level = stats.xp_to_next_level + (stats.xp_to_next_level / 10);
            // Add stat points
            stats.stats_points = stats.stats_points + 5;
            leveled_up = true;
        };
        
        // Emit event if leveled up
        if (leveled_up) {
            event::emit(LevelUp {
                owner,
                old_level,
                new_level: stats.level,
                stats_points_gained: (stats.level - old_level) * 5,
            });
        };
        
        leveled_up
    }

    // Update stats when equipping/unequipping an item
    public fun update_stats_from_item(
        owner: address,
        str_mod: u64,
        str_is_positive: bool,
        agi_mod: u64,
        agi_is_positive: bool,
        vit_mod: u64,
        vit_is_positive: bool,
        dex_mod: u64,
        dex_is_positive: bool,
        int_mod: u64,
        int_is_positive: bool,
        wis_mod: u64,
        wis_is_positive: bool,
        luk_mod: u64,
        luk_is_positive: bool
    ) acquires NFTStats {
        assert!(exists<NFTStats>(owner), error::not_found(ENO_STATS));
        
        let stats = borrow_global_mut<NFTStats>(owner);
        
        // Update stats
        if (str_mod != 0) {
            let old_value = stats.str;
            if (str_is_positive) { 
                stats.str = stats.str + str_mod; 
            } else { 
                // Subtract value, ensuring we don't underflow
                stats.str = if (stats.str > str_mod) { stats.str - str_mod } else { 0 };
            };
            
            event::emit(StatsChanged {
                owner,
                stat_name: string::utf8(b"STR"),
                old_value,
                new_value: stats.str,
            });
        };
        
        if (agi_mod != 0) {
            let old_value = stats.agi;
            if (agi_is_positive) { 
                stats.agi = stats.agi + agi_mod; 
            } else { 
                // Subtract value, ensuring we don't underflow
                stats.agi = if (stats.agi > agi_mod) { stats.agi - agi_mod } else { 0 };
            };
            
            event::emit(StatsChanged {
                owner,
                stat_name: string::utf8(b"AGI"),
                old_value,
                new_value: stats.agi,
            });
        };
        
        if (vit_mod != 0) {
            let old_value = stats.vit;
            if (vit_is_positive) { 
                stats.vit = stats.vit + vit_mod; 
            } else { 
                // Subtract value, ensuring we don't underflow
                stats.vit = if (stats.vit > vit_mod) { stats.vit - vit_mod } else { 0 };
            };
            
            event::emit(StatsChanged {
                owner,
                stat_name: string::utf8(b"VIT"),
                old_value,
                new_value: stats.vit,
            });
        };
        
        if (dex_mod != 0) {
            let old_value = stats.dex;
            if (dex_is_positive) { 
                stats.dex = stats.dex + dex_mod; 
            } else { 
                // Subtract value, ensuring we don't underflow
                stats.dex = if (stats.dex > dex_mod) { stats.dex - dex_mod } else { 0 };
            };
            
            event::emit(StatsChanged {
                owner,
                stat_name: string::utf8(b"DEX"),
                old_value,
                new_value: stats.dex,
            });
        };
        
        if (int_mod != 0) {
            let old_value = stats.int;
            if (int_is_positive) { 
                stats.int = stats.int + int_mod; 
            } else { 
                // Subtract value, ensuring we don't underflow
                stats.int = if (stats.int > int_mod) { stats.int - int_mod } else { 0 };
            };
            
            event::emit(StatsChanged {
                owner,
                stat_name: string::utf8(b"INT"),
                old_value,
                new_value: stats.int,
            });
        };
        
        if (wis_mod != 0) {
            let old_value = stats.wis;
            if (wis_is_positive) { 
                stats.wis = stats.wis + wis_mod; 
            } else { 
                // Subtract value, ensuring we don't underflow
                stats.wis = if (stats.wis > wis_mod) { stats.wis - wis_mod } else { 0 };
            };
            
            event::emit(StatsChanged {
                owner,
                stat_name: string::utf8(b"WIS"),
                old_value,
                new_value: stats.wis,
            });
        };
        
        if (luk_mod != 0) {
            let old_value = stats.luk;
            if (luk_is_positive) { 
                stats.luk = stats.luk + luk_mod; 
            } else { 
                // Subtract value, ensuring we don't underflow
                stats.luk = if (stats.luk > luk_mod) { stats.luk - luk_mod } else { 0 };
            };
            
            event::emit(StatsChanged {
                owner,
                stat_name: string::utf8(b"LUK"),
                old_value,
                new_value: stats.luk,
            });
        };
    }
    
    // Update NFT image
    public entry fun update_image(
        account: &signer,
        new_image_uri: String
    ) acquires NFTStats {
        let account_addr = signer::address_of(account);
        assert!(exists<NFTStats>(account_addr), error::not_found(ENO_STATS));
        
        let stats = borrow_global_mut<NFTStats>(account_addr);
        let old_image = stats.image_uri;
        stats.image_uri = new_image_uri;
        
        // Emit event
        event::emit(ImageChanged {
            owner: account_addr,
            old_image,
            new_image: new_image_uri,
        });
    }
    
    // Consume energy
    public fun consume_energy(owner: address, amount: u64): bool acquires NFTStats {
        assert!(exists<NFTStats>(owner), error::not_found(ENO_STATS));
        
        let stats = borrow_global_mut<NFTStats>(owner);
        
        // Check if enough energy
        if (stats.energy < amount) {
            return false
        };
        
        // Decrease energy
        stats.energy = stats.energy - amount;
        true
    }
    
    // Restore energy
    public entry fun restore_energy(account: &signer, amount: u64) acquires NFTStats {
        let account_addr = signer::address_of(account);
        assert!(exists<NFTStats>(account_addr), error::not_found(ENO_STATS));
        
        let stats = borrow_global_mut<NFTStats>(account_addr);
        stats.energy = stats.energy + amount;
    }
} 