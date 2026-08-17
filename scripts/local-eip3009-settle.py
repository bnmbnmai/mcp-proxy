#!/usr/bin/env python3
"""Broadcast a signed EIP-3009 USDC authorization. Never prints the key."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from eth_account import Account
from web3 import Web3

RPC = "https://mainnet.base.org"
CHAIN_ID = 8453
USDC = Web3.to_checksum_address("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913")
PAY_TO = Web3.to_checksum_address("0xf59621FC406D266e18f314Ae18eF0a33b8401004")

ABI = [
    {
        "name": "transferWithAuthorization",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "from", "type": "address"},
            {"name": "to", "type": "address"},
            {"name": "value", "type": "uint256"},
            {"name": "validAfter", "type": "uint256"},
            {"name": "validBefore", "type": "uint256"},
            {"name": "nonce", "type": "bytes32"},
            {"name": "signature", "type": "bytes"},
        ],
        "outputs": [],
    }
]


def load_account():
    path = Path(os.environ.get("X402_SETTLE_KEY_FILE", "")).expanduser()
    if not path.is_file():
        print(json.dumps({"ok": False, "error": "no_key_file"}))
        raise SystemExit(1)
    first = next(ln for ln in path.read_text().splitlines() if ln.strip() and not ln.strip().startswith("#"))
    blob = first.split(None, 1)[1]
    if blob.lower().startswith("key:"):
        blob = blob.split(":", 1)[1]
    if not blob.startswith("0x"):
        blob = "0x" + blob
    acct = Account.from_key(blob)
    if acct.address.lower() != PAY_TO.lower():
        print(json.dumps({"ok": False, "error": "wrong_settler"}))
        raise SystemExit(1)
    return acct


def main() -> int:
    body = json.loads(sys.stdin.read())
    auth = body["authorization"]
    sig = body["signature"]
    to = Web3.to_checksum_address(str(auth["to"]))
    if to.lower() != PAY_TO.lower():
        print(json.dumps({"ok": False, "error": "payTo"}))
        return 1
    w3 = Web3(Web3.HTTPProvider(RPC, request_kwargs={"timeout": 30, "headers": {"User-Agent": "Mozilla/5.0"}}))
    if w3.eth.chain_id != CHAIN_ID:
        print(json.dumps({"ok": False, "error": "chain"}))
        return 1
    acct = load_account()
    usdc = w3.eth.contract(USDC, abi=ABI)
    nonce = auth["nonce"]
    if isinstance(nonce, str) and nonce.startswith("0x"):
        nonce_b = bytes.fromhex(nonce[2:])
    else:
        nonce_b = bytes.fromhex(str(nonce))
    sig_b = bytes.fromhex(sig[2:] if str(sig).startswith("0x") else str(sig))
    fn = usdc.functions.transferWithAuthorization(
        Web3.to_checksum_address(str(auth["from"])),
        to,
        int(auth["value"]),
        int(auth["validAfter"]),
        int(auth["validBefore"]),
        nonce_b,
        sig_b,
    )
    gas = int(fn.estimate_gas({"from": acct.address}) * 12 / 10)
    tx = fn.build_transaction(
        {
            "from": acct.address,
            "nonce": w3.eth.get_transaction_count(acct.address),
            "gas": gas,
            "gasPrice": w3.eth.gas_price,
            "chainId": CHAIN_ID,
        }
    )
    signed = acct.sign_transaction(tx)
    raw = signed.raw_transaction if hasattr(signed, "raw_transaction") else signed.rawTransaction
    txh = w3.eth.send_raw_transaction(raw)
    rcpt = w3.eth.wait_for_transaction_receipt(txh, timeout=180)
    ok = rcpt.status == 1
    print(json.dumps({"ok": ok, "tx": w3.to_hex(txh), "status": rcpt.status}))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
