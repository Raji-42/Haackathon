import * as XLSX from 'xlsx';
import { CandidateRecord, ExcelValidationResult, ValidationErrorDetail } from '../types';

export class ExcelService {
  /**
   * Parses an Excel (.xlsx, .xls) or CSV buffer and runs rigorous row-by-row validation.
   * Atomic check: Returns full list of errors if ANY row is invalid.
   */
  public static parseAndValidateSpreadsheet(fileBuffer: Buffer): ExcelValidationResult {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return {
        isValid: false,
        totalRows: 0,
        validRowsCount: 0,
        errorRowsCount: 1,
        candidates: [],
        errors: [{ row: 0, field: 'file', value: '', message: 'Uploaded spreadsheet is empty or has no sheets' }],
      };
    }

    const worksheet = workbook.Sheets[sheetName];
    // Read rows as array of objects
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return {
        isValid: false,
        totalRows: 0,
        validRowsCount: 0,
        errorRowsCount: 1,
        candidates: [],
        errors: [{ row: 1, field: 'file', value: '', message: 'Spreadsheet has no candidate data rows' }],
      };
    }

    const errors: ValidationErrorDetail[] = [];
    const candidates: CandidateRecord[] = [];
    const seenRollNumbers = new Set<string>();

    rawRows.forEach((row, index) => {
      const rowNumber = index + 2; // Row 1 is header, data starts on Row 2
      let hasRowError = false;

      // Normalize field names (case-insensitive and trimmed)
      const normalizedRow: Record<string, any> = {};
      for (const [key, val] of Object.entries(row)) {
        normalizedRow[key.trim().toLowerCase()] = typeof val === 'string' ? val.trim() : val;
      }

      // 1. Validate Full Name
      const fullName = normalizedRow['fullname'] || normalizedRow['full name'] || normalizedRow['name'] || normalizedRow['candidate name'];
      if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
        errors.push({
          row: rowNumber,
          field: 'fullName',
          value: fullName || '',
          message: 'Student name is required and must be at least 2 characters',
        });
        hasRowError = true;
      }

      // 2. Validate Phone Number (10 digits Indian mobile number standard)
      const rawPhone = String(normalizedRow['phone'] || normalizedRow['phonenumber'] || normalizedRow['mobile'] || '').trim();
      const phoneDigits = rawPhone.replace(/\D/g, ''); // strip non-digits
      const isValidPhone = /^[6-9]\d{9}$/.test(phoneDigits); // Indian mobile starts with 6,7,8,9 and is 10 digits
      if (!isValidPhone) {
        errors.push({
          row: rowNumber,
          field: 'phone',
          value: rawPhone,
          message: 'Invalid phone number. Must be a valid 10-digit mobile number starting with 6-9',
        });
        hasRowError = true;
      }

      // 3. Roll Number
      const rollNumber = String(normalizedRow['rollnumber'] || normalizedRow['roll number'] || normalizedRow['roll_no'] || normalizedRow['candidate id'] || '').trim();
      if (!rollNumber) {
        errors.push({
          row: rowNumber,
          field: 'rollNumber',
          value: rollNumber,
          message: 'Roll number / Candidate ID is mandatory',
        });
        hasRowError = true;
      } else if (seenRollNumbers.has(rollNumber)) {
        errors.push({
          row: rowNumber,
          field: 'rollNumber',
          value: rollNumber,
          message: `Duplicate roll number '${rollNumber}' found within the same batch (already seen in previous row)`,
        });
        hasRowError = true;
      } else {
        seenRollNumbers.add(rollNumber);
      }

      // 4. Marks Validation
      const rawMarks = normalizedRow['marksobtained'] ?? normalizedRow['marks'] ?? normalizedRow['marks obtained'];
      const rawTotal = normalizedRow['totalmarks'] ?? normalizedRow['total'] ?? normalizedRow['total marks'] ?? 100;

      const marksObtained = Number(rawMarks);
      const totalMarks = Number(rawTotal);

      if (isNaN(marksObtained) || marksObtained < 0) {
        errors.push({
          row: rowNumber,
          field: 'marksObtained',
          value: rawMarks,
          message: 'Marks obtained must be a valid positive number',
        });
        hasRowError = true;
      }

      if (isNaN(totalMarks) || totalMarks <= 0) {
        errors.push({
          row: rowNumber,
          field: 'totalMarks',
          value: rawTotal,
          message: 'Total marks must be a valid number greater than 0',
        });
        hasRowError = true;
      }

      if (!isNaN(marksObtained) && !isNaN(totalMarks) && marksObtained > totalMarks) {
        errors.push({
          row: rowNumber,
          field: 'marksObtained',
          value: marksObtained,
          message: `Marks obtained (${marksObtained}) cannot exceed total marks (${totalMarks})`,
        });
        hasRowError = true;
      }

      // 5. Result
      const result = String(normalizedRow['result'] || (marksObtained >= 80 ? 'DISTINCTION' : marksObtained >= 40 ? 'PASS' : 'FAIL')).toUpperCase();
      if (result === 'FAIL') {
        errors.push({
          row: rowNumber,
          field: 'result',
          value: result,
          message: 'Candidate has FAILED the course. Only PASSED candidates can be included in certification batches',
        });
        hasRowError = true;
      }

      const email = normalizedRow['email'] ? String(normalizedRow['email']).trim() : undefined;

      if (!hasRowError) {
        candidates.push({
          fullName: String(fullName).trim(),
          phone: phoneDigits,
          email,
          rollNumber,
          marksObtained,
          totalMarks,
          result: result === 'DISTINCTION' ? 'DISTINCTION' : 'PASS',
          rowNumber,
        });
      }
    });

    const isValid = errors.length === 0;

    return {
      isValid,
      totalRows: rawRows.length,
      validRowsCount: candidates.length,
      errorRowsCount: errors.length,
      // If NOT valid, return empty candidates array to enforce ZERO partial save
      candidates: isValid ? candidates : [],
      errors,
    };
  }
}
