# Multisend

This tool allows you to make transactions with multiple transacting wallets from a single command line call.

Transactions are logged in a local json database.

Features:
- retry failed transactions
- fund transacting wallets from a single funding wallet
- create new wallets
- drain transacting wallets to a single wallet given a token address or native token

# User Guide

each wallet registered in the app has a role

role | meaning
-|-
0 | unused or purged wallets
1 | funding wallet (only one wallet can have this role at any time)
2 | transacting wallet

> a purged wallet is a wallet with the private key removed from the database, thus it cant be used anymore. It differs from an unused wallet where despite being unused its private key is still in the database.

the following are the commands you can run

---

## Auth Operations

### login
```
multisend login <plaintext> <password>
```
- `password`: the app looks for a `.env` file for the password if it doesnt exists calling this command will generate the `.env` file
- the password is used to encrypt and decrypt privatekeys stored in the database
- `plaintext`: the database also stores a cipher of this plaintext, thus decrypting the cipher with the password matching with the plaintext verifies the credentials

### logout
```
multisend logout
```
- deletes the `.env` file to log you out

### change login
```
multisend changepw <plaintext> <password>
```

---

## Wallet Operations

### create wallets
```
multisend create [role=<r>] [<N>]
```
- `r`: is the role to be set for the wallets, defaults to 2
- `N`: the number of new wallets to create, by default `1`

### register wallets
```
multisend register [role=<r>] <pks>
```
- `r`: is the role to be set for the wallets, defaults to 2

### purge wallet
```
multisend purge <address>
multisend unpurge <address> <pk> [<role>]
```
- `address`: the wallet address to purge or unpurge
- `pk`: the private key to supply for the wallet, the call will fail if the pk does not match
- `role`: role to set the wallet to, defaults to remain 0

### query
```
multisend query [<role>] [<cid>]
```
- returns all wallets registered in the database
- `role`: filter by role
- `cid`: filter by cid

### verify
```
multisend verify
```
- checks if all pks match with wallet address in database

---

## Network Management

### add network
```
multisend network add <alias> <rpc> <chainid> [gas]
multisend network delete <alias>
multisend network update <alias> [alias=<u>] [rpc=<u>] [chainid=<u>] [gas=<u>]
multisend network set <defaultAlias>
```
- `alias` is the unique network name you use when setting the network
- `rpc` is the rpc address of the network
- `chainid` is the chainId of the network
- `gas` is the gasPrice to use when transacting on the network, defaults to 0 which will be set to auto
- `u` the value you wish to update
- `defaultAlias` the default network to use for any transaction call

---

## Top Level Calls

### fund transacting wallets
```
multisend fund [<network>] <gwei> [{retry, <cid>, <wallets>}]
```
- `network`: optional network alias to use
- `gwei`: is the amount of gwei each wallet will receive, thus if you are funding `N` wallets the funding wallet must have at least `N * (gwei + gas)`
- `retry`: will look at the last funding `cid` and only fund the failed wallets, this call will use the same cid
- `cid`: will only fund the failed wallets for that cid
- `wallets`: will fund the space seprated list of wallet addresses. A warning will appear if the wallet has not been registered in the app (the app doesnt have its private key to use it as a transaction wallet)


### make transactions
```
multisend send [<network>] [[op=]<op>] [{retry, <cid>}]
```
- `network`: optional network alias to use
- `op`: is the name of the operation to run, if omitted it will run the default operation as specified in the codebase
- use `op=` to resolve conflict if network and op have the same name and you only want to provide `op`
- `retry`: similar to fund
- `cid`: similar to fund

### drain
```
multisend drain [token=<token>] <cid> <receiver>
multisend drain [token=<token>] <receiver> <wallets>
```
- `token`: token address to drain from, defaults to native token
- native token operation will leave behind the gasPrice value of token in the wallet and the rest to be drained
- `cid`: filter transacting wallets in that cid

---

## Developer Guide

The database has the following tables

table | fields | description
-|-|-
auth | cipher | the cipher text to authenticate passwords
network | network_id, alias, rpc, chainid, gas | the networks available
wallets | wallet_id, address, pk, role | registered wallets pk are encrypted with the login password
calls | cid, network_id, type, commithash, timestamp | top level command line calls
tx | txid, cid, wallet_id, hash, status, timestamp | each individual transaction