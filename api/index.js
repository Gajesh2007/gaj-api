import { abi_erc20 } from './abi/abi';
import Web3 from 'web3';

const bsc = new Web3('https://rpc-mainnet.maticvigil.com');
const ava = new Web3('https://api.avax.network/ext/bc/C/rpc');

const tokens = [   
   {
       bsc: '0x33a3d962955a3862c8093d1273344719f03ca17c',
       id: '0x595c8481c48894771CE8FaDE54ac6Bf59093F9E8',
       avaburn: '0x000000000000000000000000000000000000dEaD',
       avabridge: '0x1aFCEF48379ECad5a6D790cE85ad1c87458C0f07'       
   }
];

const find_token = (tokens, filter) => {
   return tokens.filter(t => { return t[filter.key].toLowerCase() === filter.value.toLowerCase()})[0]
 }


 const populate = (token) => {
   return Promise.all([
       new ava.eth.Contract(abi_erc20, token.id).methods.totalSupply().call().then( result => {
           return parseInt(result)
       }).catch(err => {
           console.log('no supply:', err)
       }),
       new ava.eth.Contract(abi_erc20, token.id).methods.decimals().call().then( result => {
           token.decimals = parseInt(result)
       }).catch(err => {
           console.log('no decimals:', err)
       }),        
       new ava.eth.Contract(abi_erc20, token.id).methods.name().call().then( result => {
           token.name = result
       }),
       new ava.eth.Contract(abi_erc20, token.id).methods.symbol().call().then( result => {
           token.symbol = result
       }),
       new ava.eth.Contract(abi_erc20, token.id).methods.owner().call().then( result => {
           token.owner = result
       }).catch(err => {
           //console.log('no owner:', err)            
       }),
       new ava.eth.Contract(abi_erc20, token.id).methods.totalFees().call().then( result => {            
           token.totalFees = result / 1e18
       }).catch(err => {
           //console.log('no total fees:', err)            
       })        
   ]).then(results => {
       if ( token.decimals !== 18 ) {
           console.log(token.symbol, 'decimals:', token.decimals)
       }
       token.maxSupply = results[0] / 10 ** token.decimals
       return token
   })
}


export default async function (req,res) {
    await populate(tokens[0]);
    let gaj = find_token(tokens, {key:'symbol', value: 'gaj'})
    let bscBurned = await new bsc.eth.Contract(abi_erc20, gaj.bsc).methods.balanceOf(gaj.avaburn).call();
    let avaBurned = await new ava.eth.Contract(abi_erc20, gaj.id).methods.balanceOf(gaj.avaburn).call();
    let totalSupply = await new bsc.eth.Contract(abi_erc20, gaj.bsc).methods.totalSupply().call();
    
    let report = {
        bscBurned: bscBurned / 10 ** gaj.decimals,
        avaBurned: avaBurned / 10 ** gaj.decimals,
        totalSupply: totalSupply/ 10 ** gaj.decimals
    };
   
    report.totalSupply = totalSupply;        
    report.circulatingSupply =  report.totalSupply - report.bscBurned - report.avaBurned;
    gaj = Object.assign({}, gaj, report);

    delete gaj.bsc;
    delete gaj.avaburn;
    delete gaj.avabridge;
    delete gaj.decimals;
    delete gaj.owner;
    
    
    gaj.name = gaj.name.length > 4 ? gaj.name.replace(".Finance","") : gaj.name;
    
    const {q = ''} = req.query;

    if(q.toLowerCase() == "circulatingsupply"){
        res.send(`${gaj.circulatingSupply}`);
    }
    else if(q.toLowerCase() == "id"){
        res.send(`${gaj.id}`);
    }
    else if(q.toLowerCase() == "name"){
        res.send(`${gaj.name}`);
    }
    else if(q.toLowerCase() == "totalfees"){
        res.send(`${gaj.totalFees}`);
    }
    else if(q.toLowerCase() == "symbol"){
        res.send(`${gaj.symbol}`);
    }
    else if(q.toLowerCase() == "bscburned"){
        res.send(`${gaj.bscBurned}`);
    }
    else if(q.toLowerCase() == "avaburned"){
        res.send(`${gaj.avaBurned}`);
    }
    else if(q.toLowerCase() == "supplyavax"){
        res.send(`${gaj.bscBurned}`);
    }
    else if(q.toLowerCase() == "supplybsc"){
        res.send(`${gaj.avaBurned}`);
    }
    else if(q.toLowerCase() == "totalsupply"){
        res.send(`${gaj.totalSupply}`);
    }
    else if(q.toLowerCase() == "maxsupply"){
        res.send(`${gaj.maxSupply}`);
    }
    else{
        res.json(gaj);
    }

 };
