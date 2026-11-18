export default {
  "version": 1,
  "workingHours": 2080,
  "maxSalary": 1000000000,
  "maxMeetings": 100000,
  "defaults": {"currency":"AED","attendees":6,"mode":"average","averageSalary":"25000","duration":60,"frequency":"weekly","customFrequency":""},
  "currencies": [["AED","UAE Dirham"],["USD","US Dollar"],["EUR","Euro"],["GBP","British Pound"],["SAR","Saudi Riyal"],["QAR","Qatari Riyal"],["KWD","Kuwaiti Dinar"],["BHD","Bahraini Dinar"],["OMR","Omani Rial"],["CAD","Canadian Dollar"],["AUD","Australian Dollar"],["CHF","Swiss Franc"],["SGD","Singapore Dollar"],["INR","Indian Rupee"]],
  "durations": [[15,"15 minutes"],[30,"30 minutes"],[45,"45 minutes"],[60,"1 hour"],[90,"1.5 hours"],[120,"2 hours"],[180,"3 hours"]],
  "frequencies": [["once","One time",1],["daily","Daily",260],["weekly","Weekly",52],["biweekly","Every two weeks",26],["monthly","Monthly",12],["quarterly","Quarterly",4],["custom","Custom",null]],
  "sourceUrl": "https://www.microsoft.com/en-us/worklab/work-trend-index/will-ai-fix-work"
};
