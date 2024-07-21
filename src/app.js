const axios = require('axios');
const express = require('express');
const app = express();
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


app.get('/nft/:token_id', async (req, res) => {
    try {
        const token_id = req.params.token_id;

        const provider = new RpcProvider({
            nodeUrl: process.env.RPC_URL,
        });

        const { abi: nft_contract_abi } = await provider.getClassAt(process.env.NFT_CONTRACT_ADDRESS);
        if (!nft_contract_abi) throw new Error('Invalid NFT contract address');
        const nft_contract_view = new Contract(nft_contract_abi, process.env.NFT_CONTRACT_ADDRESS, provider);

        const collection_name = feltToStr(await nft_contract_view.name());
        const owner = await nft_contract_view.owner_of(token_id);
        const metadata = await nft_contract_view.get_token_metadata(token_id);

        const { data: clone_metadata } = await axios.get(process.env.CLONE_TOKEN_URI + token_id);

        return res.status(200).json({
            tokenId: Number(token_id),
            name: `${collection_name} #${token_id}`,
            owner: formatStarknet('0x0' + owner.toString(16)),
            contract_address: process.env.NFT_CONTRACT_ADDRESS,
            image: clone_metadata?.image || process.env.UNKNOWN_IMAGE_URI,
            animation: clone_metadata?.animation_url || process.env.UNKNOWN_IMAGE_URI,
            attributes: [
                {
                    trait_type: 'Type',
                    value: Number(metadata[0])
                },
                {
                    trait_type: 'Rank',
                    value: Number(metadata[1])
                },
                {
                    trait_type: 'Power',
                    value: Number(metadata[2])
                }
            ]
        })
    } catch (err) {
        console.error(err);
        return res.status(200).send({
            tokenId: 0,
            name: 'Unknown NFT',
            image: process.env.UNKNOWN_IMAGE_URI,
            attributes: [],
            owner: formatStarknet('0x0')
        });
    }
});

app.get('/tba/:token_id', async (req, res) => {
    try {
        
    } catch (err) {
        console.error(err);
        return res.status(200).send({
            tokenId: 0,
            name: 'Unknown NFT',
            image: process.env.UNKNOWN_IMAGE_URI,
            attributes: [],
            owner: formatStarknet('0x0')
        });
    }
});

app.get('*', (req, res) => {
    res.send('Server is running!');
});

module.exports = app;