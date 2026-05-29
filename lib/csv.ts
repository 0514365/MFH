// MFH-CSV-V1
// 최소 CSV 직렬화/파싱(RFC4180 근사). 쉼표·따옴표·줄바꿈 포함 필드 지원.
// 사역 영상 CSV 내보내기/가져오기에 사용.

export function toCSV(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = cell ?? '';
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    )
    .join('\r\n');
}

export function parseCSV(input: string): string[][] {
  let text = input;
  // BOM 제거
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      pushField();
      i++;
      continue;
    }
    if (c === '\n') {
      pushField();
      pushRow();
      i++;
      continue;
    }
    if (c === '\r') {
      pushField();
      pushRow();
      i += text[i + 1] === '\n' ? 2 : 1;
      continue;
    }
    field += c;
    i++;
  }
  // 마지막 필드/행(끝에 개행 없을 때)
  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }
  return rows;
}
