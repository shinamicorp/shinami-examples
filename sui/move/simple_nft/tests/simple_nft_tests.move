
#[test_only]
module simple_nft::simple_nft_tests;
use simple_nft::sword;
 use std::string::{String};

// We've added an example test. Find links to helpful docs on testing here: 
//   https://docs.shinami.com/docs/sui-move-resources#unit-testing
#[test]
fun test_is_valid_name() {
    let short_name: String = b"basic sword".to_string();
    let short_name_valid: bool = sword::valid_name_test(&short_name);
    assert!(short_name_valid == true);

    let empty_name = b"".to_string();
    let empty_name_valid = sword::valid_name_test(&empty_name);
    assert!(empty_name_valid == false);

    // A 129 character string - one beyond the allowed maxium length
    let long_name: String = b"0CcIH8hfPUFJTpYk4uzvFnSWjSRVZoXE0CcIH8hfPUFJTpYk4uzvFnSWjSRVZoXE0CcIH8hfPUFJTpYk4uzvFnSWjSRVZoXE0CcIH8hfPUFJTpYk4uzvFnSWjSRVZoXEa".to_string();
    let long_name_valid = sword::valid_name_test(&long_name);
    assert!(long_name_valid == false);
}
