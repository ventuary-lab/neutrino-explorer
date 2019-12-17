import axios from 'axios';
import { nodeInteraction } from "@waves/waves-transactions";
import { accountData, accountDataByKey, currentHeight } from "@waves/waves-transactions/dist/nodeInteraction";

import { NeutrinoContractKeys } from "./contractKeys/NeutrinoContractKeys";
import { ControlContractKeys } from "./contractKeys/ControlContractKeys";
import { RpdContractKeys } from "./contractKeys/RpdContractKeys";
import { AuctionContractKeys } from "./contractKeys/AuctionContractKeys";
import { OrderKeys } from "./contractKeys/OrderKeys";


export class ExplorerApi {
    static readonly WAVELET: number = (10 ** 8);
    neutrinoContractAddress: string;
    auctionContractAddress: string;
    controlContractAddress: string;
    rpdContractAddress: string;
    nodeUrl: string;
    neutrinoAssetId: string;
    bondAssetId: string;
    liquidationContractAddress: string;

    public static async create(nodeUrl: string, neutrinoContractAddress: string){
        const accountDataState = await nodeInteraction.accountData(neutrinoContractAddress, nodeUrl);

        const auctionContractAddress = <string>accountDataState[NeutrinoContractKeys.AuctionContractAddressKey].value
        const controlContractAddress = <string>accountDataState[NeutrinoContractKeys.ControlContractAddressKey].value
        const liquidationContractAddress = <string>accountDataState[NeutrinoContractKeys.LiquidationContractAddressKey].value
        const rpdContractAddress = <string>accountDataState[NeutrinoContractKeys.RpdContractAddressKey].value


        const neutrinoAssetId = <string>accountDataState[NeutrinoContractKeys.NeutrinoAssetIdKey].value
        const bondAssetId = <string>accountDataState[NeutrinoContractKeys.BondAssetIdKey].value


        const stakedBalanceKey = <string>accountDataState[RpdContractKeys.BalanceKey].value
        const neutrinoLockedBalanceKey = <string>accountDataState[AuctionContractKeys.WavesLockedBalanceKey].value

        return new ExplorerApi(nodeUrl, neutrinoContractAddress, auctionContractAddress, controlContractAddress, liquidationContractAddress, rpdContractAddress, neutrinoAssetId, bondAssetId)
    }

    public constructor(nodeUrl: string, neutrinoContractAddress: string, auctionContractAddress: string, controlContractAddress: string, liquidationContractAddress: string, rpdContractAddress: string, neutrinoAssetId: string, bondAssetId: string){
        this.neutrinoContractAddress = neutrinoContractAddress;
        this.auctionContractAddress = auctionContractAddress;
        this.controlContractAddress = controlContractAddress;
        this.liquidationContractAddress = liquidationContractAddress;
        this.rpdContractAddress = rpdContractAddress;

        this.neutrinoAssetId = neutrinoAssetId;
        this.bondAssetId = bondAssetId;
        this.nodeUrl = nodeUrl;
    }

    //Helpers
    private async getAssetQuantity(){
      const assetObject = await axios.get(this.nodeUrl+'assets/details/'+this.neutrinoAssetId);
      const assetQuantity = assetObject.data.quantity;

      return <number>(assetQuantity);
    }

    private async getNeutrinoBalance(contractAddress){
      const assetBalance = await nodeInteraction.assetBalance(this.neutrinoAssetId, contractAddress, this.nodeUrl);
      return <number>(assetBalance);
    }

    // private async getAccountDataByKey(key, contractAddress):Promise<number>{
    //       return <number>(await nodeInteraction.accountDataByKey(key, controlContract, this.nodeUrl)).value/100;
    // }
    //
    private async getNeutrinoLockedBalance():Promise<number>{
      console.log(AuctionContractKeys.WavesLockedBalanceKey);
      console.log(this.auctionContractAddress);

      return <number>(await nodeInteraction.accountDataByKey(AuctionContractKeys.WavesLockedBalanceKey, this.neutrinoContractAddress, this.nodeUrl)).value/100;
    }

    private getSmartContractAddresses(){
      console.log(this.neutrinoContractAddress,this.auctionContractAddress,this.controlContractAddress,this.liquidationContractAddress,this.rpdContractAddress);
    }

    //Public API methods
    public async getPrice():Promise<any> {
      let key = "price_";
      const startingHeight = 1713703;
      let currentHeight = await nodeInteraction.currentHeight(this.nodeUrl);
      let obj = {};

      for (let i = startingHeight; i < currentHeight; i+=10) {
        let price = await nodeInteraction.accountDataByKey(key+i,this.neutrinoContractAddress,this.nodeUrl);
        try{
          obj[i] = price.value;
        } catch(e){
          console.log("This block has no price set");
        }

        console.log(obj);
      }

      console.log(startingHeight);
      console.log(currentHeight);
      return <number>(await nodeInteraction.accountDataByKey(ControlContractKeys.PriceKey, this.controlContractAddress, this.nodeUrl)).value/100;
    }

    public async getAllPrice(){
    }

    public async getBalance():Promise<number> {
      return <number>(await nodeInteraction.balance(this.neutrinoContractAddress, this.nodeUrl)/ExplorerApi.WAVELET);
    }

    public async getTotalIssued():Promise<number>{
      const assetObject = await axios.get(this.nodeUrl+'assets/details/'+this.neutrinoAssetId);
      const assetQuantity = await this.getAssetQuantity();
      const assetDecimals = await this.getDecimals();

      const neutrinoBalance = await this.getNeutrinoBalance(this.neutrinoContractAddress)/(10**assetDecimals);
      const liquidationBalance = await this.getNeutrinoBalance(this.liquidationContractAddress)/(10**assetDecimals);

      console.log(neutrinoBalance);
      console.log(liquidationBalance);

      return <number>(10**12-neutrinoBalance-liquidationBalance);
    }

    public async getStaked():Promise<number>{
      return <number>(await nodeInteraction.accountDataByKey(RpdContractKeys.BalanceKey+"_"+this.neutrinoAssetId, this.rpdContractAddress, this.nodeUrl)).value/10**await this.getDecimals();
    }

    public async getAnnualYield():Promise<number>{
      const monetaryConstant = 6.85;
      const leasingShare = 0.9;
      const nodePerfLagCoefficient = 0.98;
      const stakingShare = await this.getStaked()/await this.getTotalIssued();

      return <number>(nodePerfLagCoefficient*leasingShare*monetaryConstant/stakingShare);
    }

    public async getCirculatingSupply():Promise<number>{
      return <number>(await this.getTotalIssued() - await this.getStaked());
    }

    public async getCirculatingSupplyNoDec():Promise<number>{
      return <number>((await this.getTotalIssued() - await this.getStaked()) * (10 ** await this.getDecimals()));
    }

    public async getDeficit():Promise<number>{
      //let neutrinoSupply = await this.getAssetQuantity() - await this.getNeutrinoBalance() + await this.getNeutrinoLockedBalance();
      // let reserve = wavesBalance(neutrinoContract) - wavesLockedBalance; //TODO
      let price = await this.getPrice();
      // let deficit = neutrinoSupply - (reserve*price/100*PAULI/WAVELET); //TODO

      return <number>(0);//TODO

    }

    public async getDecimals():Promise<number>{
      const assetObject = await axios.get(this.nodeUrl+'assets/details/'+this.neutrinoAssetId);
      const assetDecimals = assetObject.data.decimals;

      return <number>(assetDecimals);
    }

}
