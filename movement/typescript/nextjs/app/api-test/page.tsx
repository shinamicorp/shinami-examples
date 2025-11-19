import { GasStationClient } from "@shinami/clients/aptos";

export default async function Page() {
    if (!process.env.SHINAMI_PRIVATE_BACKEND_GAS_STATION_API_KEY) {
        throw Error('SHINAMI_PRIVATE_BACKEND_GAS_STATION_API_KEY .env.local variable not set');
    }
    const gasStationClient = new GasStationClient(process.env.SHINAMI_PRIVATE_BACKEND_GAS_STATION_API_KEY!);
    const fundInfo = await gasStationClient.getFund();
    return (
        <>
            <p>
                Balance = {fundInfo.balance}
            </p>
        </>
    )
}