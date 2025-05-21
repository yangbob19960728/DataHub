import { DropdownItem } from "../constants";

export function buildOptions<T extends string>(
  labelMap: Record<T, string>,
  translate: (key: string) => string
): DropdownItem<T>[] {
  return Object.entries(labelMap).map(([code, i18nKey]: [T, string]) => ({
    code: code,
    name: translate(i18nKey),
  }));
}
