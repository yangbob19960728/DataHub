import axios from 'axios';
import { Step1Data, FieldMapping } from '../contexts/dataIngestionContext';
import { AUTH_METHOD_OPTIONS, DATA_PROCESSING_METHODS, INTERVAL_OPTIONS, REQUEST_METHOD_OPTIONS } from '../constants/dropdownOptions';
enum DataStoreStatus {
  IDLE = 0,
  ACTIVE = 1,
  ERROR = 2,
}
interface ApiResponse<T> {
  code: string;
  data: T;
}

interface DatastoreJob {
  authorization_method: typeof AUTH_METHOD_OPTIONS[number]['code'];
  data_processing_method: typeof DATA_PROCESSING_METHODS[number]['code'];
  interval: typeof INTERVAL_OPTIONS[number]['code'];
  isActivity: boolean;
  job_name: string;
  last_receive_time: Date;
  modify_time: Date;
  request_method: typeof REQUEST_METHOD_OPTIONS[number]['code'];
  request_url: string;
  status: DataStoreStatus
}

export const dataIngestionService = {
  async getExistingNames(): Promise<string[]> {
    const response = await axios.get(`${process.env.API_HOST}/datahub/datastore-job?nameOnly=true`);
    const data = response.data;
    if (data && Array.isArray(data.data)) {
      return data.data.map((item: any) => item.job_name);
    }
    return [];
  },

  async testApiConnection(step1Data: Step1Data): Promise<any> {
    const payload = {
      request_url: step1Data.dataEndpoint,
      request_method: step1Data.requestMethod.code,
      authorization_method: step1Data.authMethod,
      basic_username: step1Data.username,
      basic_password: step1Data.password,
      api_token_url: step1Data.apiKey,
      api_token_body: step1Data.requestParameters,
    };
    const response = await axios.post(`${process.env.API_HOST}/datahub/datastore/queryDataSource`, payload);
    return response.data;
  },

  async parsePreviewData(apiData: any, fieldMappings: FieldMapping[]): Promise<any> {
    const rules = fieldMappings.map(mapping => {
      const expr = mapping.cleaningRule || ('$.' + (mapping.data.path?.join('.') || ''));
      return {
        key: mapping.targetField,
        isPK: mapping.isPK,
        transform: { type: 'jsonata', expression: expr }
      };
    });
    const payload = {
      data_source: { type: 'json', data: apiData },
      cleaning_rule: rules
    };
    const response = await axios.post(`${process.env.API_HOST}/datahub/datastore/parse-jsonata`, payload);
    return response.data?.data;
  },

  async saveDataStore(step1Data: Step1Data, fieldMappings: FieldMapping[]): Promise<void> {
    const rules = fieldMappings.map(mapping => {
      const expr = mapping.cleaningRule || ('$.' + (mapping.data.path?.join('.') || ''));
      return {
        key: mapping.targetField,
        isPK: mapping.isPK,
        sourceField: mapping.data.path?.join('.'),
        dataType: mapping.dataType,
        ruleType: mapping.ruleType,
        transform: { type: 'jsonata', expression: expr }
      };
    });
    const payload = {
      api: {
        request_url: step1Data.dataEndpoint,
        request_method: step1Data.requestMethod.code,
        authorization_method: step1Data.authMethod,
        basic_username: step1Data.username,
        basic_password: step1Data.password,
        api_token_url: step1Data.apiKey,
        api_token_body: step1Data.requestParameters,
        interval: step1Data.interval.code
      },
      dataStore: {
        name: step1Data.dataStoreName,
        data_processing_method: step1Data.dataProcessingMethod,
        data_formate: step1Data.dataFormate.code,
        data: rules
      }
    };
    await axios.post(`${process.env.API_HOST}/datahub/datastore-job`, payload);
  },

  async getJobsList(): Promise<DatastoreJob[]> {
    const response = await axios.get<ApiResponse<DatastoreJob[]>>(`${process.env.API_HOST}/datahub/datastore-job`);
    console.log('response', response);
    const data = response.data;
    if (data && Array.isArray(data.data)) {
      return data.data.map((item: DatastoreJob) => ({
        ...item,
        isActivity: item.isActivity || false
      }));
    }
    return [];
  },
  async getJobDetail(jobNameList: string[]): Promise<any> {
    const response = await Promise.all(jobNameList.map((jobName) => axios.get<ApiResponse<any>>(`${process.env.API_HOST}/datahub/datastore-job/${jobName}`)));
    return response.map(res => res.data);
  }
};
