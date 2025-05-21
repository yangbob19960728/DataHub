// CreateDataProduct.jsx (主頁面元件)
import React, { useState, useRef } from 'react';
import { Steps } from 'primereact/steps';
import { Toast } from 'primereact/toast';
import Step1ConnectionSetup from '../components/dataProduct/ConnectionSetup';
import SelectDataStore from '../components/dataProduct/SelectDataStore';
import FieldMapping from '../components/dataProduct/FieldMapping';
import PreviewValidation from '../components/dataProduct/PreviewValidation';
import { FormDataProvider } from '../contexts/dataProductFormDataContext';
import { useTranslation } from 'react-i18next';
export interface FormDataTouched {
    productName: boolean;
    apiPath: boolean;
    apiKey: boolean;
    username: boolean;
    password: boolean;
}



const CreateDataProduct = () => {
    const toast = useRef(null);
    const [activeStep, setActiveStep] = useState(0);
    const { t } = useTranslation();
    // 綜合表單資料狀態
    // const [formData, setFormData] = useState<FormData>({ ...INITIAL_FROM_DATA });
    const stepItems = [
        { label: t('connectionSetup') },
        { label: t('selectDataStore') },
        { label: t('fieldMapping') },
        { label: t('dataPreview') }
    ];

    const goNext = () => setActiveStep(prev => prev + 1);
    const goPrev = () => setActiveStep(prev => prev - 1);

    // 顯示 Toast 訊息的輔助函式
    const showToast = (message) => {
        toast.current && toast.current.show(message);
    };

    return (
        <FormDataProvider>
            <h2>Create Data Products</h2>
            <p className="text-muted mb-4">Follow the steps to configure a new data product API.</p>
            <Toast ref={toast} />
            {/* Stepper 流程指示 */}
            <Steps model={stepItems} activeIndex={activeStep} readOnly />
            {activeStep === 0 && (
                <div className="mt-4 mx-auto col-8">
                    <Step1ConnectionSetup
                        onNext={goNext}
                        showToast={showToast} />
                </div>
            )}
            {activeStep === 1 && (
                <div className="mt-4 mx-auto col-10 md:col-8 lg:col-6">
                    <SelectDataStore
                        onPrev={goPrev}
                        onNext={goNext}
                        showToast={showToast} />
                </div>
            )}
            {activeStep === 2 && (
                <FieldMapping
                    onPrev={goPrev}
                    onNext={goNext}
                    showToast={showToast}  />
            )}
            {activeStep === 3 && (
                <PreviewValidation
                    onPrev={goPrev}
                    showToast={showToast} />
            )}

        </FormDataProvider>
    );
};

export default CreateDataProduct;