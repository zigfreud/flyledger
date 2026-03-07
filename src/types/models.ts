export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_active: number;
}

export interface CaptureRecord {
  id: string;
  capture_type: 'IMAGE' | 'QR_CODE' | 'MANUAL';
  captured_at: number;
  status: 'captured' | 'normalized' | 'extracted' | 'pending_review' | 'validated' | 'discarded' | 'failed';
  media_local_path: string | null;
  raw_payload: string | null;
  payload_format: 'URL' | 'TEXT' | null;
  failure_reason: string | null;
}

export interface ProcessingSnapshot {
  id: string;
  capture_record_id: string;
  processed_at: number;
  normalized_text: string | null;
  suggested_date: number | null;
  suggested_date_confidence: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  suggested_amount: number | null;
  suggested_amount_confidence: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  suggested_merchant: string | null;
  suggested_merchant_confidence: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  warnings: string | null;
}

export interface Expense {
  id: string;
  capture_record_id: string;
  category_id: string;
  amount: number;
  date: number;
  merchant_name: string | null;
  description: string | null;
  retained_image_path: string | null;
  created_at: number;
  updated_at: number;
}
