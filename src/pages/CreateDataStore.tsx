import { useGlobalState } from 'piral';
import * as React from 'react';
import { Steps } from 'primereact/steps';
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { useMemo, useState } from 'react';
import { Button } from "primereact/button";
import FieldMapping from '../components/dataIngestion/FieldMapping';
import DataCleaning from '../components/dataIngestion/DataCleaning';
import DataPreview from '../components/dataIngestion/DataPreview';
import { useTranslation } from 'react-i18next';
import { RadioButton } from 'primereact/radiobutton';
import { INITIAL_STEP1_DATA, useDataIngestion } from '../contexts/dataIngestionContext';
import ConnectionSetup from '../components/dataIngestion/ConnectionSetup';


export default () => {
  const { t } = useTranslation();
  const {
    isStep1Valid,
    isStep2Valid,
    isStep3Valid,
    isEnabledTestApiConnection,
    step1Data,
    step1Errors,
    step1Touched,
    setStep1Data,
    setStep1Errors,
    setStep1Touched,
    fieldMappings,
    apiData,
    setApiData,
    setFieldMappings,
    addMapping,
    updateFieldMapping,
    removeFieldMapping,
    updateFieldPK
  } = useDataIngestion();
  const [currentStep, setCurrentStep] = useState(0);
  const StepItems = [
    {
      label: t('connectionSetup')
    },
    {
      label: t('fieldMapping')
    },
    {
      label: t('dataCleaning')
    },
    {
      label: t('dataPreview')
    }
  ];
  const goStep = (offset) => {
    const newStep = currentStep + offset;
    if (newStep >= 0 && newStep < StepItems.length) {
      setCurrentStep(newStep);
    }
  }
  const isCurrentStepValid = useMemo(() => {
    switch (currentStep) {
      case 0:
        return isStep1Valid;
      case 1:
        return isStep2Valid;
      case 2:
        return isStep3Valid;
      default:
        return false;
    }
  }, [currentStep, isStep1Valid, isStep2Valid, isStep3Valid]);
  const clearAllData = () => {
    setFieldMappings([]);
    setApiData(null);
    setStep1Data({ ...INITIAL_STEP1_DATA });
  };
  return (
    <>
      <div className="col-12 h-full">
        <div className="mb-5 md:col-12 mx-auto lg:col-10">
          <Steps
            model={StepItems}
            activeIndex={currentStep}
          />
        </div>
        {
          currentStep === 0 &&
          <div className="p-fluid lg:col-8 mx-auto">
            <ConnectionSetup
              step1Data={step1Data}
              step1Errors={step1Errors}
              step1Touched={step1Touched}
              isEnabledTestApiConnection={isEnabledTestApiConnection}
              setStep1Data={setStep1Data}
              setStep1Errors={setStep1Errors}
              setStep1Touched={setStep1Touched}
              setApiData={setApiData}
              apiData={apiData} />
          </div>
        }
        {
          currentStep === 1 && (
            <FieldMapping
              fieldMappings={fieldMappings}
              setFieldMappings={setFieldMappings}
              apiData={apiData}
              addMapping={addMapping}
              updateFieldMapping={updateFieldMapping}
              removeFieldMapping={removeFieldMapping}
              updateFieldPK={updateFieldPK}
            />
          )
        }
        {
          currentStep === 2 && (
            <DataCleaning
              fieldMappings={fieldMappings}
              updateFieldMapping={updateFieldMapping}
              updateFieldPK={updateFieldPK}
              removeFieldMapping={removeFieldMapping}
            />
          )
        }
        {
          currentStep === 3 && (
            <DataPreview
              fieldMappings={fieldMappings}
              step1Data={step1Data}
              apiData={apiData}
              clearAll={clearAllData}
            />
          )
        }
        <div className='flex mt-5'>
          {
            currentStep > 0 &&
            <div className='flex-none mr-auto'>
              <Button label={t('previous')} onClick={(e) => goStep(-1)} />
            </div>
          }
          {
            currentStep < StepItems.length - 1 &&
            <div className='flex-none ml-auto'>
              <Button label={t('next')} disabled={!isCurrentStepValid} onClick={(e) => goStep(1)} />
            </div>
          }
        </div>
      </div>

    </>
  );
};
