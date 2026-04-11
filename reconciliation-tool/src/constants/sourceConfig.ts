import type { SourceType } from '../types';

export interface SourceConfig {
  type: SourceType;
  label: string;
  description: string;
  acceptedFormats: string;
  acceptedMimeTypes: string[];
  isImageSource: boolean;
  icon: string;
}

export const SOURCE_CONFIGS: SourceConfig[] = [
  {
    type: 'ab_policy',
    label: 'AgencyBloc Policy Report',
    description: 'Policy report exported from AgencyBloc CRM',
    acceptedFormats: '.csv, .xlsx, .xls',
    acceptedMimeTypes: [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
    isImageSource: false,
    icon: '📋',
  },
  {
    type: 'ab_individual',
    label: 'AgencyBloc Individual Report',
    description: 'Individual/client report exported from AgencyBloc CRM',
    acceptedFormats: '.csv, .xlsx, .xls',
    acceptedMimeTypes: [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
    isImageSource: false,
    icon: '👤',
  },
  {
    type: 'humana_bob',
    label: 'Humana Book of Business',
    description: 'Book of Business from Humana (log history format — most recent will be extracted)',
    acceptedFormats: '.csv, .xlsx, .xls',
    acceptedMimeTypes: [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
    isImageSource: false,
    icon: '🏥',
  },
  {
    type: 'uhc_bob',
    label: 'UHC Book of Business',
    description: 'Book of Business from United Healthcare (final status)',
    acceptedFormats: '.csv, .xlsx, .xls',
    acceptedMimeTypes: [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
    isImageSource: false,
    icon: '🏢',
  },
  {
    type: 'uhc_ocr',
    label: 'UHC Screenshots',
    description: 'Screenshot images of UHC client data (will be processed with OCR)',
    acceptedFormats: '.png, .jpg, .jpeg, .webp, .bmp',
    acceptedMimeTypes: [
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/bmp',
    ],
    isImageSource: true,
    icon: '📸',
  },
];

export function getSourceConfig(type: SourceType): SourceConfig {
  const config = SOURCE_CONFIGS.find(c => c.type === type);
  if (!config) throw new Error(`Unknown source type: ${type}`);
  return config;
}
