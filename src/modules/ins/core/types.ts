export interface InsMetricPoint {
  year: number;
  value: number;
}

export interface InsMetric {
  code: string;
  unit: string;
  label: string;
  data: InsMetricPoint[];
}
