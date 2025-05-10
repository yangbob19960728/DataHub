import jsonata from 'jsonata';
import { Step1Data, Step1Errors, FieldMapping, RuleValidationState } from '../contexts/dataIngestionContext';
import { AUTH_METHOD_OPTIONS } from '../constants/dropdownOptions';
import { t } from 'i18next';

export const validateTargetField = (value: string, all: string[], index: number): string => {
  
  return '';
};
  export const validateJsonataExpression = async (expression: string, data: any): Promise<RuleValidationState> => {
    const expr = expression.trim();
    if (expr === '') {
      return RuleValidationState.None;
    }
    try {
      const calculatedValue = await jsonata(expr).evaluate(data);
      return calculatedValue !== undefined ? RuleValidationState.Success : RuleValidationState.Error;
    } catch {
      return RuleValidationState.Error;
    }
  };



/**
 * Validate Step 1 (Connection Setup) data and return an errors object.
 */
export function validateStep1Data(data: Step1Data, existingNames: string[]): Step1Errors {
  const errors: Step1Errors = {
    dataStoreName: '',
    dataEndpoint: '',
    apiKey: '',
    username: '',
    password: '',
    testApiConnection: '',
  }
  if (data.dataStoreName.length === 0 || (!data.dataStoreName.match(/^[a-z][a-z0-9_]*$/))) {
    errors.dataStoreName = t("dataStoreName.invalid");
  }
  if (existingNames.includes(data.dataStoreName)) {
    errors.dataStoreName = t("dataStoreName.duplicate");
  }

  if (!data.dataEndpoint.match(/^https?:\/\/.+/)) {
    errors.dataEndpoint = t("apiSourceConfiguration.invalid");
  }
  const bearerCode = AUTH_METHOD_OPTIONS[1].code;
  const basicCode = AUTH_METHOD_OPTIONS[2].code;
  if (data.authMethod === bearerCode && !data.apiKey) {
    errors.apiKey = t("authMethod.apiKeyValue.invalid");
  }

  if (data.authMethod === basicCode) {
    if (!data.username) {
      errors.username = t("authMethod.username.invalid");
    }
    if (!data.password) {
      errors.password = t("authMethod.password.invalid");
    }
  }
  if (!data.testApiConnection) {
    errors.testApiConnection = t("testApiConnection.failure");
  }
  return errors;
}

/**
 * Validate field mappings for unique and non-empty target fields.
 * Returns a new list of FieldMappings with updated targetFieldError.
 */
export function validateFieldMappings(fieldMappings: FieldMapping[]): FieldMapping[] {
  return fieldMappings.map((mapping, index) => {
    const value = mapping.targetField;
    const isEmpty = !value.trim();
    const isDuplicate = fieldMappings.some((m, i) => i !== index && m.targetField === value);
    const error = isEmpty ? t('validation.requiredField') : isDuplicate ? t('validation.duplicateField') : '';
    return { ...mapping, targetFieldError: error };
  });
}
