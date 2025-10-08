script {
    use aptos_framework::aptos_coin;
    use aptos_framework::coin;
    use aptos_framework::signer;

    fun unfair_swap_coins(
        sender: &signer,
        secondary: &signer
    ) {
        let coin_first = coin::withdraw<aptos_coin::AptosCoin>(sender, 100);
        let coin_second = coin::withdraw<aptos_coin::AptosCoin>(secondary, 200);

        coin::deposit(signer::address_of(secondary), coin_first);
        coin::deposit(signer::address_of(sender), coin_second);
    }
}
