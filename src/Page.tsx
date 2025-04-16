import { useGlobalState } from 'piral';
import * as React from 'react';
import { Steps } from 'primereact/steps';
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { useMemo, useState } from 'react';
import { Button } from "primereact/button";
interface DropdownItem {
  name: string;
  code: string;
}
export default () => {
  const [currentStep, setCurrentStep] = useState(0);
  const StepItems = [
    {
      label: 'Connection Setup'
    },
    {
      label: 'Field Mapping'
    },
    {
      label: 'Data Cleaning'
    },
    {
      label: 'Data Preview & Validation'
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
      <div className="col-12 h-full">
        <div className="mt-3 md:col-12 mx-auto lg:col-10">
          <Steps
            model={StepItems}
            activeIndex={currentStep}
          />
          {
            currentStep === 0 && <div className="p-fluid mt-5">
              <div className="field grid">
                <label
                  htmlFor="data-name"
                  className="col-12 mb-2 md:col-2 md:mb-0 justify-content-end"
                >
                  Data Name
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
                  Data Endpoint
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
                  Authentication Method
                </label>
                <div className="col-12 md:col-10">
                  <InputText id="authentication-method" type="text" placeholder='API Key' />
                </div>
              </div>
              <div className="field grid">
                <label htmlFor="request-method" className='col-12 mb-2 md:col-2 md:mb-0 justify-content-end'>Request Method</label>
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
                  Request Parameters
                </label>
                <div className="col-12 md:col-10">
                  <InputText id="request-parameters" type="text" />
                </div>
              </div>
              <div className='field flex justify-content-end m'>
                <div className='flex-none'>
                  <Button label="Text API Connection" onClick={(e) => console.log(e)} />
                </div>
              </div>
              <div className="field grid">
                <label htmlFor="interval" className='col-12 mb-2 md:col-2 md:mb-0 justify-content-end'>Interval</label>
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
                <label htmlFor="data-processing-method" className='col-12 mb-2 md:col-2 md:mb-0 justify-content-end'>Data Processing Method</label>
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
                <label htmlFor="data-formate" className='col-12 mb-2 md:col-2 md:mb-0 justify-content-end'>Data Formate</label>
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
          <div className='flex'>
            {
              currentStep > 0 &&
              <div className='flex-none mr-auto'>
                <Button label="Pre" onClick={(e) => goStep(-1)} />
              </div>
            }
            {
              currentStep < StepItems.length - 1 &&
              <div className='flex-none ml-auto'>
                <Button label="Next" onClick={(e) => goStep(1)} />
              </div>
            }
          </div>
        </div>
      </div>
    </>
  );
};
