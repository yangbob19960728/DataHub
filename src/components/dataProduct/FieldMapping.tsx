// FieldMapping.jsx
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { dataIngestionService } from '../../services/dataIngestionService';
import { useTranslation } from 'react-i18next';
import { Skeleton } from 'primereact/skeleton';
import { IntegrationDataStoreMode } from '../../constants';
import { debounce, set, update } from 'lodash';
import { DataType } from '../../contexts/dataIngestionContext';
import { error } from 'console';
import './fieldMapping.css';
import { use } from 'i18next';
import { FormData, useFormData } from '../../contexts/dataProductFormDataContext';

interface FieldMappingProps {
    onPrev: () => void;
    onNext: () => void;
    showToast: (message: { severity: string; summary: string; detail: string }) => void;
}
interface FieldMappingItem {
    key: string;
    isOutPut: boolean;
    isSearchParameter: boolean;
    keyTouched: boolean;
    keyError: string;
    outputTouched: boolean;
    outputError: string;
    searchParameterError: string;
    searchParameterTouched: boolean;
}
interface DataStoreItem {
    job_name: string;
    list: {
        dataType: DataType | null;
        key: string | null;
    }[];
}
export function buildDataStoreList(rawData: any, maxLength: number): DataStoreItem[] {
    return rawData.map(item => {
        const dataStoreName = item?.data?.dataStore?.name
        const source = item?.data?.dataStore?.data.map(item => ({
            dataType: item.dataType,
            key: item.key,
        }));

        const all = source.concat(Array(Math.max(maxLength - source.length, 0)).fill({
            dataType: null,
            key: null,
        }));
        return {
            job_name: dataStoreName,
            list: all,
        }
    })
}
export function buildFieldMappingList(maxLength: number): FieldMappingItem[] {
    return [...Array(maxLength)].map(i => ({
        key: '',
        isOutPut: false,
        isSearchParameter: false,
        keyTouched: false,
        keyError: '',
        outputTouched: false,
        outputError: '',
        searchParameterError: '',
        searchParameterTouched: false,
    }))
}

const FieldMapping = ({ onPrev, onNext, showToast }: FieldMappingProps) => {
    const { formData, updateFormData } = useFormData();
    const [loading, setLoading] = useState(false);
    const [storesError, setStoresError] = useState('');
    const [apiError, setApiError] = useState('');
    const [dataStoreList, setDataStoreList] = useState<DataStoreItem[]>([]);
    const [fieldMappingList, setFieldMappingList] = useState<FieldMappingItem[]>(formData.fieldMappings);
    const { t } = useTranslation();
    const tableContainerRefs = useRef<HTMLDivElement[]>([]);
    const [typeErrorList, setTypeErrorList] = useState<number[]>([]);
    const fieldTouched = useRef({});
    // 動態對齊每列高度
    const alignRowHeights = useCallback(debounce(() => {
        const containers = tableContainerRefs.current;
        if (!containers.length) return;

        // 假設每個表格列數一致
        const rowCount = containers[0]?.querySelectorAll('table tr').length || 0;
        for (let i = 0; i < rowCount; i++) {
            let maxHeight = 0;
            // 找出第 i 列的最大高度
            containers.forEach(container => {
                const row = container.querySelectorAll('table tr')[i] as HTMLElement;
                if (row) {
                    maxHeight = Math.max(maxHeight, row.offsetHeight);
                }
            });
            // 設定所有表格第 i 列為最大高度
            containers.forEach(container => {
                const row = container.querySelectorAll('table tr')[i] as HTMLElement;
                if (row) {
                    row.style.height = `${maxHeight}px`;
                }
            });
        }
    }, 100), []);

    // 初次渲染完成後進行對齊
    useLayoutEffect(() => {
        if (dataStoreList.length > 0) {
            alignRowHeights();
        }
    }, [dataStoreList, fieldMappingList, alignRowHeights]);

    // ResizeObserver 監聽每個表格內容變動
    useEffect(() => {
        const observer = new ResizeObserver(() => {
            alignRowHeights();
        });
        tableContainerRefs.current.forEach(container => {
            if (container) observer.observe(container);
        });
        return () => observer.disconnect();
    }, [alignRowHeights]);
    useEffect(() => {
        const fetchDataStoreNames = async () => {
            setLoading(true);
            try {
                const list = await dataIngestionService.getJobDetail(formData.selectedStores.map(item => item.name));

                const maxLength = Math.max(...list.map(item => item?.data?.dataStore?.data?.length || 0));
                const dataStoreList = buildDataStoreList(list, maxLength);
                const newFieldMappingList = buildFieldMappingList(maxLength);
                setFieldMappingList(newFieldMappingList);
                setDataStoreList(dataStoreList);
                setApiError('');
                // 執行第一次驗證
                init(newFieldMappingList);

            } catch (error) {
                console.error('Failed to fetch data store names:', error);
                // 顯示錯誤訊息
                setApiError(t('error.apiConnection'));
                // showToast
                showToast({
                    severity: 'error',
                    summary: t('error.apiConnection'),
                    detail: (error?.message) ? t('error.apiConnectionErrorMessage', { message: error?.message }) : t('error.unknownError'),
                });
            } finally {
                // 清除錯誤狀態
                setLoading(false);
                setStoresError('');
            }
        }
        fetchDataStoreNames();

        return () => {
            // debounceValidateOutputFieldCheckbox.cancel();
            // debounceValidateOutputFieldName.cancel();
            alignRowHeights.cancel();

        }
    }, []);
    // 更新某筆欄位對應的狀態
    const updateField = (index, updates) => {
        setDataStoreList(current => current.map((item, i) => i === index ? { ...item, list: updates } : item));
    }


    const handleNext = () => {
        if (isValid) {
            const dataProduct = fieldMappingList.map((field, index) => {
                const dataType = [];
                const source = dataStoreList.map(dataStore => {
                    dataType.push(dataStore.list[index].dataType);
                    return {
                        data_store_name: dataStore.job_name,
                        data_store_key: dataStore.list[index].key
                    }
                }).sort((a, b) => (a.data_store_key === null) ? 1 : -1); // data_store_key 為 null 的資料排在最後，限制：後端第一筆資料不能是null
                return {
                    source,
                    key: field.key,
                    data_type: dataType.filter(d => d !== null)?.[0],
                    is_out_put: field.isOutPut,
                    is_search_parameter: field.isSearchParameter
                }
            })
            // 更新父狀態並進入下一步
            updateFormData({ fieldMappings: fieldMappingList, dataProduct });
            onNext();
        }
    };
    const allOutPutFieldChecked = useMemo(() => {
        return fieldMappingList.every(m => m.isOutPut);
    }, [fieldMappingList]);

    const onChangeAllCheckbox = (checked) => {
        // const newList: FieldMappingItem[] = [...fieldMappingList].map((item) => ({
        //     ...item,
        //     isOutPut: checked,
        //     isSearchParameter: !checked ? false : item.isSearchParameter,
        //     searchParameterError: checked ? '' : item.searchParameterError,
        //     outputTouched: true
        // }))

        setFieldMappingList((prev) => {
            const newList = [...prev];
            const list = prev.map(() => checked);
            const error = validateOutputFieldCheckbox(list);
            return newList.map((item, i) => {
                // if (i === index) {
                //     return { 
                //         ...item, 
                //         outputError: error 
                //     };
                // }
                return {
                    ...item,
                    isOutPut: checked,
                    isSearchParameter: !checked ? false : item.isSearchParameter,
                    searchParameterError: checked ? '' : item.searchParameterError,
                    outputTouched: true,
                    outputError: (error && i === 0) ? error : '', 
                };
            });
        });
        // debounceValidateOutputFieldCheckbox(0, newList.map(item => item.isOutPut), () => {
        //     setFieldMappingList((prev) => {
        //         const newList = [...prev];

        //         return newList.map((item) => ({
        //             ...item,
        //             outputTouched: true
        //         }));
        //     });
        // });
    }
    const isStepValid = useCallback((dataStoreList: DataStoreItem[], fieldMappingList: FieldMappingItem[]) => {
        if (dataStoreList.length === 0) {
            return
        }
        const validFieldMapping = fieldMappingList.every((item) => item.keyError === '' && item.outputError === '');

        const maxLength = dataStoreList[0].list.length;
        const typeErrorList = [];
        for (let index = 0; index < maxLength; index++) {
            const typeList = dataStoreList.map((item) => {
                return item.list[index].dataType;
            }).filter((item) => item !== null);
            const isValid = typeList.every((item) => {
                return item === typeList[0];
            });
            if (!isValid) {
                typeErrorList.push(index);

            }

        }
        setTypeErrorList(typeErrorList);
        return (typeErrorList.length > 0) ? false : validFieldMapping;
    }, [])

    const transformNullValue = (value) => {
        if (value === null) {
            return "NULL";
        }
        return value;
    }

    const onChangeOutputFieldCheckbox = (e, options) => {
        const checked = e.checked;
        // const newList = [...fieldMappingList];
        // newList[options.rowIndex] = {
        //     ...newList[options.rowIndex],
        //     isOutPut: checked,
        //     isSearchParameter: !checked ? false : newList[options.rowIndex].isSearchParameter,
        //     searchParameterError: checked ? '' : newList[options.rowIndex].searchParameterError,
        // };
        // setFieldMappingList(newList);

        setFieldMappingList((prev) => {
            const newList = [...prev];
            const outPutList = newList.map(item => item.isOutPut);
            outPutList[options.rowIndex] = checked;
            const error = validateOutputFieldCheckbox(outPutList);
            return newList.map((item, i) => {
                if (i === options.rowIndex) {
                    return {
                        ...item,
                        isOutPut: checked,
                        isSearchParameter: !checked ? false : newList[options.rowIndex].isSearchParameter,
                        searchParameterError: checked ? '' : newList[options.rowIndex].searchParameterError,
                        outputError: error,
                        outputTouched: true
                    };
                }
                return {
                    ...item,
                    outputError: ''
                };
            });
        });
        // debounce 驗證欄位名稱唯一性
        // debounceValidateOutputFieldCheckbox(options.rowIndex, newList.map(item => item.isOutPut), () => {
        //     if (!fieldMappingList[options.rowIndex].outputTouched) {
        //         setFieldMappingList((prev) => {
        //             const newList = [...prev];
        //             newList[options.rowIndex] = {
        //                 ...newList[options.rowIndex],
        //                 outputTouched: true
        //             };
        //             return newList;
        //         });
        //     }
        // });
    }
    const validateOutputFieldCheckbox = useCallback((list: boolean[]) => {
        return (list.every(item => item === false)) ? t('validation.requireOutputFieldCheckbox') : '';
    }, []);
    // 驗證outputCheckbox欄位
    const debounceValidateOutputFieldCheckbox = useCallback(debounce((index: number, list: boolean[], callback?: Function) => {
        const error = validateOutputFieldCheckbox(list);
        setFieldMappingList((prev) => {
            const newList = [...prev];
            return newList.map((item, i) => {
                if (i === index) {
                    return { ...item, outputError: error };
                }
                return {
                    ...item,
                    outputError: ''
                };
            });
        });
        if (callback) {
            callback();
        }
    }, 300), []);
    // useEffect(() => {
    //     debounceValidateField();
    // }, [fieldMappingList]);
    // const debounceValidateField = useCallback(debounce(() => {
    //     const list = fieldMappingList.map(item => item.key);
    //     const OutputFieldNameErrors = fieldMappingList.map((item, index) => {
    //         return validateOutputFieldName(index, fieldMappingList[index].key, list);
    //     });
    //     const checkBoxError = validateOutputFieldCheckbox(fieldMappingList.map(item => item.isOutPut));
    //     setFieldMappingList((prev) => {
    //         const newList = [...prev];
    //         return newList.map((item, index) => ({
    //             ...item,
    //             outputError: index === 0 ? checkBoxError : '',
    //             keyError: OutputFieldNameErrors[index]
    //         }));
    //     });
    // }, 300), []);
    const onChangeOutputFieldName = (e, options) => {
        const value = e.target.value;
        // newList[options.rowIndex] = { ...newList[options.rowIndex], key: value };
        // setFieldMappingList(newList);
        console.log('onChangeOutputFieldName', value, options.rowIndex);
        // debounce 驗證欄位名稱唯一性

        setFieldMappingList((prev) => {
            console.log('onChangeOutputFieldName prev', prev[options.rowIndex]);
            const newList = [...prev];
            const list = newList.map(item => item.key);
            const error = validateOutputFieldName(options.rowIndex, value, list);
            newList[options.rowIndex] = {
                ...newList[options.rowIndex],
                key: value,
                keyError: error,
                keyTouched: true
            };
            return newList;
        });

        // debounceValidateOutputFieldName(options.rowIndex, value, list, () => {
        //     setFieldMappingList((prev) => {
        //         const newList = [...prev];
        //         newList[options.rowIndex] = {
        //             ...newList[options.rowIndex],
        //             keyTouched: true
        //         };
        //         return newList;
        //     });
        // });
    }
    // 驗證output欄位名稱唯一性
    const validateOutputFieldName = useCallback((index: number, item: string, list: string[]) => {
        item = item.trim();
        if (item.length === 0) {
            return t('validation.requireOutputFieldName');
        }
        // 僅允許英文與數字組成
        const regex = /^[a-zA-Z0-9_]+$/;
        if (!regex.test(item)) {
            return t('validation.invalidOutputFieldName');
        }
        // 檢查是否有重複
        return (list.some((value, i) => (i !== index && value === item))) ? t('validation.duplicateOutputFieldName') : '';
    }, []);

    const onChangeSearchableParameter = (e, options) => {
        const checked = e.checked;
        setFieldMappingList((prev) => {
            const error = validateSearchableParameter(options.rowIndex, checked, prev);
            const newList = [...prev];
            return newList.map((item, i) => {
                if (i === options.rowIndex) {
                    return { 
                        ...item,
                        isSearchParameter: (error === "") ? checked : newList[options.rowIndex].isSearchParameter,
                        searchParameterError: error,
                        searchParameterTouched: true,
                    };
                }
                return item;
            });
        });
    }
    const validateSearchableParameter = useCallback((index: number, checked: boolean, list: FieldMappingItem[]) => {
        if (!list[index].isOutPut && checked) {
            return t('validation.invalidSearchParameter');
        }
        return "";
    }, []);

    const init = (fieldMappingList: FieldMappingItem[]) => {
        const list = fieldMappingList.map(item => item.key);
        const OutputFieldNameErrors = fieldMappingList.map((item, index) => {
            return validateOutputFieldName(index, fieldMappingList[index].key, list);

        });
        const checkBoxError = validateOutputFieldCheckbox(fieldMappingList.map(item => item.isOutPut));
        setFieldMappingList((prev) => {
            const newList = [...prev];
            return newList.map((item, index) => ({
                ...item,
                outputError: index === 0 ? checkBoxError : '',
                keyError: OutputFieldNameErrors[index]
            }));
        });
    }



    const isValid = useMemo(() => {
        return isStepValid(dataStoreList, fieldMappingList);
    }, [dataStoreList, fieldMappingList, isStepValid]);
    const createRowClass = (allData) => {
        return (rowData) => {
            const index = allData.findIndex(item => item === rowData);
            return (typeErrorList.includes(index)) ? 'row-error' : '';
        }
    }
    const style = useMemo(() => ({
        // key field
        keyField: {
            width: '14rem',
            maxWidth: '14rem',
            minWidth: '14rem',
            wordBreak: "break-word" as 'break-word',

        },
        // data type field
        dataTypeField: {
            width: '8rem',
            maxWidth: '8rem',
            minWidth: '8rem',
        },
        outPutField: {
            width: '12rem',
            maxWidth: '12rem',
            minWidth: '12rem',
        },
        searchableField: {
            width: '14rem',
            maxWidth: '14rem',
            minWidth: '14rem',
        }
    }), [])
    const dataStoreTable =
        dataStoreList.map((item, index) => (
            <div key={index} ref={el => (tableContainerRefs.current[index] = el!)} >
                <DataTable value={item.list} rowClassName={createRowClass(item.list)} className="p-datatable-sm" reorderableRows={dataStoreList.length > 1} onRowReorder={(e) => { updateField(index, e.value); alignRowHeights(); }}>
                    {
                        dataStoreList.length > 1 && <Column rowReorder style={{ width: '3rem' }} />}
                    <Column style={style.keyField} body={(rowData) => transformNullValue(rowData.key)} header={`Data Store ${index + 1} Field`} ></Column>
                    <Column style={style.keyField} body={(rowData) => transformNullValue(rowData.dataType)} header="Data Type"></Column>
                    <Column style={{ width: '2rem' }} />
                </DataTable>
            </div>
        ));
    const otherTable = <div ref={el => (tableContainerRefs.current[dataStoreList.length] = el!)}>
        <DataTable value={fieldMappingList} rowClassName={createRowClass(fieldMappingList)} className="p-datatable-sm">
            <Column header={`Output Field Name`}
                style={style.keyField}
                body={(rowData, options) => (
                    <div className="flex flex-column" >
                        <InputText
                            value={rowData.key}
                            invalid={rowData.keyTouched && rowData.keyError}
                            className="p-inputtext-sm"
                            onChange={(e) => onChangeOutputFieldName(e, options)}
                        />
                        {
                            rowData.keyTouched && rowData.keyError && (
                                <small className="p-error">{rowData.keyError}</small>
                            )
                        }
                    </div>
                )}>

            </Column>
            <Column
                header={() => <>
                    <span className='mr-2'>Output Field</span>
                    <Checkbox checked={allOutPutFieldChecked} onChange={(e) => onChangeAllCheckbox(e.checked)}>
                    </Checkbox>
                </>
                }
                className='text-center vertical-align-middle'
                style={style.outPutField}
                body={(rowData, options) =>
                    < >
                        <Checkbox checked={rowData.isOutPut} onChange={(e) => onChangeOutputFieldCheckbox(e, options)}>
                        </Checkbox>
                        <div>
                            {
                                rowData.outputTouched && rowData.outputError && (
                                    <small className="p-error">{rowData.outputError}</small>
                                )
                            }
                        </div>
                    </>
                } />
            <Column
                header="Searchable Parameter"
                style={style.searchableField}
                className='text-center vertical-align-middle'
                body={(rowData, options) =>
                    <>
                        <Checkbox checked={rowData.isSearchParameter} onChange={(e) => onChangeSearchableParameter(e, options)}>
                        </Checkbox>
                        <div>
                            {
                                rowData.searchParameterTouched && rowData.searchParameterError && (
                                    <small className="p-error">{rowData.searchParameterError}</small>
                                )
                            }
                        </div>
                    </>
                } />
        </DataTable>
    </div>;
    if (loading) {
        return (
            <Skeleton width='100%' height='500px' />
        )
    }
    if (apiError) {
        return (
            <div className='p-error'>{apiError}</div>
        )
    }
    return (
        <>
            <div className='flex mt-5 justify-content-center'>
                <div>
                    <span className='text-lg'>Data Store:</span>
                    {
                        dataStoreList.map((item, index) => (
                            <span className="inline-flex select-none align-items-center ml-2 py-2 px-3 border-round-lg text-white" style={{ backgroundColor: "var(--gray-600)" }} key={index}>
                                <span>{item.job_name}</span>
                            </span>
                        ))
                    }
                </div>
                <div className='ml-4'>
                    <span className='text-lg'>Data Integration Mode:</span>

                    <span className="inline-flex select-none align-items-center ml-2 py-2 px-3 border-round-lg text-white" style={{ backgroundColor: "var(--gray-600)" }} >
                        <span>{
                            (formData.integrationMode === IntegrationDataStoreMode.Single) ? 'Single Output Mode' : 'Merge Mode'
                        }</span>
                    </span>

                </div>
            </div>
            <div className='text-right mt-5'>{
                typeErrorList.length > 0 && (
                    <small className="p-error">Inconsistent data types across sources. Cannot proceed.</small>
                )
            }</div>
            <div className='flex overflow-x-auto mt-2 justify-content-center' id='field-mapping-container'>
                <div className='flex min-w-0'>
                    {dataStoreTable}
                    {otherTable}
                </div>
            </div>
            <div className="mx-auto mt-4 col-10 flex justify-content-between">
                <Button label="Previous" icon="pi pi-arrow-left"
                    className="p-button-secondary" onClick={() => { onPrev(); }} />
                <Button label="Next" icon="pi pi-arrow-right" iconPos="right" onClick={handleNext} disabled={!isValid} className="p-button-primary"
                />
            </div>
        </>
    );
};

export default FieldMapping;
