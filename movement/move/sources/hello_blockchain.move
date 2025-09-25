module hello_blockchain::message {
    use std::error;
    use std::signer;
    use std::string::{String};
    use aptos_framework::account;
    use aptos_framework::event;

    struct MessageHolder has key {
        message: String,
        message_change_events: event::EventHandle<MessageChangeEvent>,
    }

    struct MessageChangeEvent has drop, store {
        from_message: String,
        to_message: String,
    }

    /// Error code indicating no message is present.
    const ENO_MESSAGE: u64 = 0;

    #[view]
    public fun signature(): address {
        @hello_blockchain
    }

    #[view]
    public fun get_message(addr: address): String acquires MessageHolder {
        assert!(exists<MessageHolder>(addr), error::not_found(ENO_MESSAGE));
        borrow_global<MessageHolder>(addr).message
    }

    public entry fun set_message(account: signer, message: String) acquires MessageHolder {
        let account_addr = signer::address_of(&account);
        if (!exists<MessageHolder>(account_addr)) {
            move_to(&account, MessageHolder {
                message,
                message_change_events: account::new_event_handle<MessageChangeEvent>(&account),
            });
        } else {
            let message_holder = borrow_global_mut<MessageHolder>(account_addr);
            let from_message = message_holder.message;
            event::emit_event(&mut message_holder.message_change_events, MessageChangeEvent {
                from_message,
                to_message: copy message,
            });
            message_holder.message = message;
        }
    }

    #[test(account = @0x1)]
    public entry fun sender_can_set_message(account: signer) acquires MessageHolder {
        let addr = signer::address_of(&account);
        aptos_framework::account::create_account_for_test(addr);
        set_message(account, std::string::utf8(b"Hello, Blockchain"));

        assert!(
            get_message(addr) == std::string::utf8(b"Hello, Blockchain"),
            ENO_MESSAGE
        );
    }

    #[test]
    public fun signature_okay() {
        assert!(signature() == @hello_blockchain, ENO_MESSAGE);
    }
}