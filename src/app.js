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
  

app.get('/metadata/:collection_address/:token_id', async (req, res) => {
    try {
        const collection_address = req.params.collection_address;
        const token_id = req.params.token_id;

        const provider = new RpcProvider({
            nodeUrl: process.env.RPC_URL,
        });
        const { abi: nft_contract_abi } = await provider.getClassAt(collection_address);
        if (!nft_contract_abi) throw new Error('Invalid NFT contract address');
        const nft_contract_view = new Contract(nft_contract_abi, collection_address, provider);

        const { abi: gacha_contract_abi } = await provider.getClassAt(process.env.GACHA_CONTRACT_ADDRESS);
        if(!gacha_contract_abi) throw new Error('Invalid Gacha contract address');
        const gacha_contract_view = new Contract(gacha_contract_abi, process.env.GACHA_CONTRACT_ADDRESS, provider);
        
        const collection_name = feltToStr(await nft_contract_view.name());
        const owner = await nft_contract_view.owner_of(token_id);
        const collection_index = await gacha_contract_view.get_collection_index(collection_address);
        const nft_metadata = await gacha_contract_view.token_metadata(collection_address, token_id);

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
            image: `${process.env.BASE_URL}/image/${Number(collection_index)}/${Number(nft_metadata[0])}`,
            owner: formatStarknet('0x0' + owner.toString(16))
        })
    } catch (err) {
        res.status(200).send({
            tokenId: 0,
            name: 'Unknown NFT',
            image: 'https://th.bing.com/th/id/OIP.WoxzZ7a55-kKVyfIUDwdVgHaHa',
            attributes: [],
            owner: formatStarknet('0x0')
        });
    }
});

app.get('/image/:id/:type', (req, res) => {
    const { id, type } = req.params;
    const filePath = path.join(__dirname, 'images/' + id + '/' + type + '.png');
    res.sendFile(filePath, (err) => {
        res.sendFile('https://th.bing.com/th/id/OIP.WoxzZ7a55-kKVyfIUDwdVgHaHa');
    });
});

app.get('*', (req, res) => {
    res.send('Server is running!');
});

module.exports = app;