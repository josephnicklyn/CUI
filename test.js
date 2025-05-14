/**
 * Checks if a given year is a leap year according to the Gregorian calendar rules
 * (divisible by 4, but not by 100 unless also divisible by 400).
 *
 * @param {number} year The year to check.
 * @returns {boolean} True if the year is a leap year, false otherwise.
 */
function isLeapYear(year) {
    if (year % 4 !== 0) {
      return false;
    }
    if (year % 100 === 0 && year % 400 !== 0) {
      return false;
    }
    return true;
  }

  function getDayIndexForDate(year, month=0, day=0) {
    // Zeller's Congruence algorithm to find the day of the week
    let q = day;
    let m = month;
    let Y = year;
  
    if (m < 3) {
      m += 12;
      Y -= 1;
    }
  
    let K = Math.floor(Y / 100);
    let J = Y % 100;
  
    let h = (q + Math.floor((13 * (m + 1)) / 5) + J + Math.floor(J / 4) - Math.floor(K / 4) - 2 * K) % 7;
  
    // Adjust the result so that 0 is Sunday, 1 is Monday, ..., 6 is Saturday
    const dayIndex = (h + 6) % 7;
    return dayIndex;
  }
  
  function getFirstDayIndicesOver400Years(startYear) {
    const indices = {};
    for (let month = 1; month <= 12; month++) {
      indices[month] = {};
      for (let i = 0; i < 400; i++) {
        const year = startYear + i;
        indices[month][year] = getDayIndexForDate(year, month, 1);
      }
    }
    return indices;
  }

const DAYS_OF_WEEK = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
  function isLeapYear(year) {
      if (year % 4 !== 0) {
        return false;
      }
      if (year % 100 === 0 && year % 400 !== 0) {
        return false;
      }
      return true;
  }
  
  function firstDay(year, month=0, day=0) {
      let fd = 6;
      let yr = year % 400;
      for (let y = 0; y < yr; y++) { // Fix: y < yr
          fd += isLeapYear(y) ? 2 : 1;
      }
      let ly = isLeapYear(year); // Use actual year for leap year check
      for (let m = 0; m < month; m++) {
          fd += MONTH_LENGTHS[m] + (m == 1 && ly ? 1 : 0);
      }
      fd += day + 1; // Fix: day + 1 for 1-based days
      return fd % 7;
  }
  
  let fd = firstDay(1040, 4, 12);
  console.log({ fd, name: DAYS_OF_WEEK[fd] });