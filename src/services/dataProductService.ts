import axios from 'axios';


export interface SaveDataProductPayload {
  api: {
    request_url: string; // 完整API路徑
    request_method: string; // GET或POST
    authorization_method: string;
    basic_username: string;
    basic_password: string;
    api_token: string; // apiKey
  },
  data_product: {
    name: string; // 資料產品名稱
    integration_mode: string; // 整合模式 Single或 Merge
    data: {
      source: {
        data_store_name: string; // Data Store名稱
        data_store_key: string; // Data Store Key，沒有則為null
      }[],
      key: string; // 欄位名稱
      data_type: string; // 資料型態
      is_out_put: boolean; // 是否為輸出欄位
      is_search_parameter: boolean; // 是否為搜尋參數

    }[]
  },
  user_info: {
    name: string; // 使用者名稱
  }
}

export interface queryDataProductPayload {
  data_product: SaveDataProductPayload['data_product'];
}
export const dataProductService = {
  async getExistingProductNames(): Promise<string[]> {
    // TODO: 取得已存在的資料產品名稱
    const response = await axios.get(`${process.env.API_HOST}/datahub/dataproduct-job?nameOnly=true`);
    const data = response.data;
    if (data && Array.isArray(data.data)) {
      return data.data.map((item: any) => item.job_name);
    }
    return [];
  },
  async queryDataProduct(params: string, payload: queryDataProductPayload): Promise<string[]> {
    const path = `${process.env.API_HOST}/datahub/dataproduct/query-dataproduct${((params) ? `?${params}` : '')}`;
    const response = await axios.post(path, payload);
    return response.data;
  },
  async saveDataProduct(payload: SaveDataProductPayload): Promise<void> {
    const response = await axios.post(`${process.env.API_HOST}/datahub/dataproduct-job`, payload);
    return response.data;
  },
}
