


generate-sdks:
	yarn generate-sdks

build:
	yarn build
 
deploy: 
	yarn solana:deploy

program-show:
	solana program show $(POOL_PARTY_RAYDIUM_KEY)

set-config-local:
	solana config set --url localhost 

set-config-devnet:
	solana config set --url devnet

logs:
	solana logs

airdrop:
	 solana airdrop 100

test:
	yarn test

sync-keys:
	anchor keys sync

my-wallet:
	solana address
 
start-test-validator:
	solana-test-validator -r

test-rust:
	cargo build-sbf
	cargo test --features test --test vault
