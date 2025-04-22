import { useGlobalState } from 'piral';
import * as React from 'react';
import { Steps } from 'primereact/steps';
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { useMemo, useState } from 'react';
import { Button } from "primereact/button";
import FieldMapping from './components/dataIngestion/FieldMapping';
import { DataIngestionProvider } from './contexts/dataIngestionContext';
import DataCleaning from './components/dataIngestion/DataCleaning';
import DataPreview from './components/dataIngestion/DataPreview';
import { useTranslation } from 'react-i18next';
interface DropdownItem {
  name: string;
  code: string;
}
export default () => {
  const [currentStep, setCurrentStep] = useState(0);
  const { t } = useTranslation();
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
  const dropdownItems: DropdownItem[] = useMemo(
    () => [
      { name: "Get", code: "get" },
      { name: "Post", code: "post" },
    ],
    []
  );
  const [dropdownItem, setDropdownItem] = useState<DropdownItem>(dropdownItems[0]);


  const dropdownIntervalItems: DropdownItem[] = useMemo(
    () => [
      { name: "5m", code: "5min" },
      { name: "10m", code: "10min" },
      { name: "15m", code: "15min" },
      { name: "30m", code: "30min" },
    ],
    []
  );
  const [dropdownIntervalItem, setDropdownIntervalItem] = useState<DropdownItem>(dropdownIntervalItems[0]);

  const dropdownDataProcessingMethodItems = useMemo(
    () => [
      { name: "Replace", code: "replace" },
      { name: "", code: "" },
    ],
    []);
  const [dropdownDataProcessingMethodItem, setDropdownDataProcessingMethodItem] = useState<DropdownItem>(dropdownDataProcessingMethodItems[0]);
  const dropdownDataFormateItems = useMemo(
    () => [
      { name: "JSON", code: "json" },
      { name: "CSV", code: "csv" },
    ],
    []
  );
  const [dropdownDataFormateItem, setDropdownDataFormateItem] = useState<DropdownItem>(dropdownDataFormateItems[0]);
  const goStep = (step) => {
    if (step + currentStep >= 0 && step + currentStep < StepItems.length) {
      setCurrentStep(currentStep + step);
    }
    console.log('Next Step');
  }
  return (
    <>
      <DataIngestionProvider>
        <div className="col-12 h-full">
          <div className="mb-5 md:col-12 mx-auto lg:col-10">
            <Steps
              model={StepItems}
              activeIndex={currentStep}
            />
          </div>
          {/* <div className="mt-3 md:col-12 lg:col-10"> */}
          {
            currentStep === 0 && <div className="p-fluid md:col-12 lg:col-10 mx-auto">
              <div className="field grid">
                <label
                  htmlFor="data-name"
                  className="col-12 mb-2 md:col-2 md:mb-0 justify-content-end"
                >
                  {t('dataName')}
                </label>
                <div className="col-12 md:col-10">
                  <InputText id="data-name" type="text" />
                </div>
              </div>
              <div className="field grid">
                <label
                  htmlFor="data-endpoint"
                  className="col-12 mb-2 md:col-2 md:mb-0 justify-content-end"
                >
                  {t('dataEndpoint')}
                </label>
                <div className="col-12 md:col-10">
                  <InputText id="data-endpoint" type="text" placeholder='https://' />
                </div>
              </div>
              <div className="field grid">
                <label
                  htmlFor="uthentication-method"
                  className="col-12 mb-2 md:col-2 md:mb-0 justify-content-end"
                >
                  {t('authenticationMethod')}
                </label>
                <div className="col-12 md:col-10">
                  <InputText id="authentication-method" type="text" placeholder='API Key' />
                </div>
              </div>
              <div className="field grid">
                <label htmlFor="request-method" className='col-12 mb-2 md:col-2 md:mb-0 justify-content-end'>{t('requestMethod')}</label>
                <div className="col-12 md:col-10">
                  <Dropdown
                    id="request-method"
                    value={dropdownItem}
                    onChange={(e) => setDropdownItem(e.value)}
                    options={dropdownItems}
                    optionLabel="name"
                    defaultValue={dropdownItems[0].name}
                  ></Dropdown>
                </div>

              </div>
              <div className="field grid">
                <label
                  htmlFor="request-parameters"
                  className="col-12 mb-2 md:col-2 md:mb-0 justify-content-end"
                >
                  {t('requestParameters')}
                </label>
                <div className="col-12 md:col-10">
                  <InputText id="request-parameters" type="text" />
                </div>
              </div>
              <div className='field flex justify-content-end m'>
                <div className='flex-none'>
                  <Button label={t('testApiConnection')} onClick={(e) => console.log(e)} />
                </div>
              </div>
              <div className="field grid">
                <label htmlFor="interval" className='col-12 mb-2 md:col-2 md:mb-0 justify-content-end'>{t('interval')}</label>
                <div className="col-12 md:col-10">
                  <Dropdown
                    id="interval"
                    value={dropdownIntervalItem}
                    onChange={(e) => setDropdownIntervalItem(e.value)}
                    options={dropdownIntervalItems}
                    optionLabel="name"
                    defaultValue={dropdownIntervalItems[0].name}
                  ></Dropdown>
                </div>
              </div>
              <div className="field grid">
                <label htmlFor="data-processing-method" className='col-12 mb-2 md:col-2 md:mb-0 justify-content-end'>{t('dataProcessingMethod')}</label>
                <div className="col-12 md:col-10">
                  <Dropdown
                    id="data-processing-method"
                    value={dropdownDataProcessingMethodItem}
                    onChange={(e) => setDropdownDataProcessingMethodItem(e.value)}
                    options={dropdownDataProcessingMethodItems}
                    optionLabel="name"
                    defaultValue={dropdownDataProcessingMethodItems[0].name}
                  ></Dropdown>
                </div>
              </div>
              <div className="field grid">
                <label htmlFor="data-formate" className='col-12 mb-2 md:col-2 md:mb-0 justify-content-end'>{t('dataFormat')}</label>
                <div className="col-12 md:col-10">
                  <Dropdown
                    id="data-formate"
                    value={dropdownDataFormateItem}
                    onChange={(e) => setDropdownDataFormateItem(e.value)}
                    options={dropdownDataFormateItems}
                    optionLabel="name"
                    defaultValue={dropdownDataFormateItems[0].name}
                  ></Dropdown>
                </div>
              </div>


            </div>
          }
          {
            currentStep === 1 && <FieldMapping />
          }
          {
            currentStep === 2 && <DataCleaning />
          }
          {
            currentStep === 3 && <DataPreview />
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
                <Button label={t('next')} onClick={(e) => goStep(1)} />
              </div>
            }
          </div>
        </div>
      </DataIngestionProvider>
    </>
  );
};
