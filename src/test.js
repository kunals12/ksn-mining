
import Web3 from 'web3';

const web3 = new Web3('https://bsc-testnet-rpc.publicnode.com');

async function test() {

    const txn = await web3.eth.getTransaction("0xdb5057bbfaddd97a1cf1b8f1da028aeb9bb1eb9a9402129e9b609a3f8a0d88af");

    // Check if transaction exists
    if (!txn) {
      throw new Error("Transaction not found");
    }

    console.log(txn);
}

test();
