const express = require('express');
const app = express();
const path = require('path');
const {
    Contract, RpcProvider
} = require('starknet');
require('dotenv').config();

const feltToStr = (felt) => {
    let hex = felt.toString(16);
    if (hex.length % 2 !== 0) {
        hex = '0' + hex;
    }
    const text = Buffer.from(hex, 'hex').toString('utf8');
    return text;
};

const formatStarknet = (address) => {
    if (!address) return '';
    return (
      address.split('x')[0] +
      'x' +
      '0'.repeat(66 - address.length) +
      address.split('x')[1]
    );
  };
  

app.get('/metadata/:collection_index/:token_id', async (req, res) => {
    try {
        const collection_index = req.params.collection_index;
        const token_id = req.params.token_id;

        const provider = new RpcProvider({
            nodeUrl: process.env.RPC_URL,
        });

        const { abi: gacha_contract_abi } = await provider.getClassAt(process.env.GACHA_CONTRACT_ADDRESS);
        if(!gacha_contract_abi) throw new Error('Invalid Gacha contract address');
        const gacha_contract_view = new Contract(gacha_contract_abi, process.env.GACHA_CONTRACT_ADDRESS, provider);

        // get NFT contract address by collection index
        const nft_contract_address_bigint = await gacha_contract_view.get_collection(collection_index);
        const nft_contract_address = formatStarknet('0x0' + nft_contract_address_bigint.toString(16));

        // connect to NFT contract
        const { abi: nft_contract_abi } = await provider.getClassAt(nft_contract_address);
        if (!nft_contract_abi) throw new Error('Invalid NFT contract address');
        const nft_contract_view = new Contract(nft_contract_abi, nft_contract_address, provider);
        
        const collection_name = feltToStr(await nft_contract_view.name());
        const owner = await nft_contract_view.owner_of(token_id);
        const nft_metadata = await gacha_contract_view.token_metadata(nft_contract_address, token_id);
        const nft_image_array = await nft_contract_view.token_image(Number(nft_metadata[0]));
        const nft_image = nft_image_array.map(feltToStr).join('');
        return res.status(200).send({
            name: `${collection_name} #${token_id}`,
            attributes: [
                {
                    trait_type: 'Type',
                    value: Number(nft_metadata[0])
                },
                {
                    trait_type: 'Rank',
                    value: Number(nft_metadata[1])
                },
                {
                    trait_type: 'Power',
                    value: Number(nft_metadata[2])
                }
            ],
            image: nft_image,
            owner: formatStarknet('0x0' + owner.toString(16))
        })
    } catch (err) {
        res.status(200).send({
            tokenId: 0,
            name: 'Unknown NFT',
            image: 'https://th.bing.com/th/id/OIP.WoxzZ7a55-kKVyfIUDwdVgHaHa',
            attributes: [],
            owner: formatStarknet('0x0'),
            error: err.message
        });
    }
});

app.get('*', (req, res) => {
    res.send('Server is running!');
});

module.exports = app;