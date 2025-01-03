
/// Code was adapted from the Sui Foundation's sample code for using
/// Sui Object Display standard: https://docs.sui.io/standards/display

module simple_nft::sword {

    use sui::package;
    use sui::display;
    use std::string::{Self, String};

    const EBadDurability: u64 = 0;
    const EBadAttackPower: u64 = 1;
    const EBadName: u64 = 2;

    public struct Sword has key, store {
        id: UID,
        name: String,
        image_url: String, // the IPFS CID
        attack_power: u16,
        remaining_durability: u8
    }

    /// One-Time-Witness for the module.
    public struct SWORD has drop {}

    /// Claim the `Publisher` object in the module initializer 
    /// to then create a `Display`. The `Display` is initialized with
    /// a set of keys and values (but can be modified later) and 
    /// published via the `update_version` call.
    fun init(otw: SWORD, ctx: &mut TxContext) {
        let keys = vector[
            b"name".to_string(),
            b"link".to_string(),
            b"image_url".to_string(),
            b"description".to_string(),
            b"project_url".to_string(),
            b"creator".to_string(),
        ];

        let values = vector[
            b"{name}".to_string(),
            // Link to the object to use in the game (fake exanple)
            b"https://epic-sword-fighterz-battle-game.io/items/{id}".to_string(),
            // Uses a Filebase.com free account gateway
            b"https://increasing-indigo-platypus.myfilebase.com/ipfs/{image_url}".to_string(),
            b"Sword item for the Epic Sword Fighterz Battle game!".to_string(),
            // This is a fake URL just to show what it might be
            b"https://epic-sword-fighterz-battle-game.io".to_string(),
            // A fake creator name to show what it might be
            b"BestWeb3Gamez".to_string(),
        ];

        // Claim the `Publisher` for the package!
        let publisher = package::claim(otw, ctx);

        // Get a new `Display` object for the `Sword` type.
        let mut display = display::new_with_fields<Sword>(
            &publisher, keys, values, ctx
        );

        // Commit first version of `Display` to apply changes.
        display.update_version();

        transfer::public_transfer(publisher, ctx.sender());
        transfer::public_transfer(display, ctx.sender());
    }

    /// Anyone can mint their `Sword` in this example as long as they provide valid name, durability, and attack 
    /// power values.  This is so that developers can use our tutorials that make a call to this function without 
    /// needing any extra setup. For your game you'd likely want to limit this to a wallet you control, or to 
    /// wallets you give the rights to mint. For an example of that, see the Move code for our game dashboard demo
    /// Demo: https://demo.shinami.com/
    /// Move code: https://github.com/shinamicorp/shinami-demo-app/tree/main/move
    #[allow(lint(self_transfer))]
    public fun mint(name: String, image_url: String, attack_power: u16, remaining_durability: u8, ctx: &mut TxContext) {
        assert!(is_valid_name(&name), EBadName);
        assert!(is_valid_attack_power(attack_power), EBadAttackPower);
        assert!(is_valid_durability(remaining_durability), EBadDurability);

        let sword = Sword {
            id: object::new(ctx),
            name,
            image_url,
            attack_power,
            remaining_durability
        };
        let sender = ctx.sender();

        transfer::public_transfer(sword, sender);
    }

    /// NFT name must be between 1-128 characters
    fun is_valid_name(name: &String): bool {
            !string::is_empty(name) && string::length(name) <= 128
    }

    /// An item can be have between 1-100% of it's durability remaining
    fun is_valid_durability(remaining_durability: u8): bool {
        remaining_durability > 0 && remaining_durability <= 100
    }

    /// Attack power cannot be negative and cannot be above the max possible
    fun is_valid_attack_power(attack_power: u16): bool {
        attack_power >= 0 && attack_power <= 10_000
    }
}
