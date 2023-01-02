import { AxiosResponse } from "axios";
import { openServer } from "./axios";
import { getAuthCode, isAuthCodeExists } from "./storage";
import { LoginArgs, LoginResponse, ResponseData, ResponseSchema } from "./types";


export async function fetchUserEOAExistence(eoa: string): Promise<boolean> {
    const res = await openServer
        .post<ResponseData<{exists: boolean}>>('/login/eoa', {
            eoa
        })
    return res.data.data?.exists || true;
   
}


export async function loginUser(args: Partial<LoginArgs>){
    const headers: Record<string, string> = {};
    if (isAuthCodeExists()) {
        headers['Authorization'] = getAuthCode()
    }
    
    const res = await openServer.post<ResponseData<LoginResponse>>('/login', args,
        {
            headers: headers
        }
        );
    
    return res.data;  

}