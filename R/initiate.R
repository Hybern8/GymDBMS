start_task <- function() {
  # Load library
  suppressPackageStartupMessages(library(RODBC))
  suppressPackageStartupMessages(library(lubridate))
  
  # Set file path
  file_path <- "C:/Users/hyber/gym-dbms/R/"
  file_deposit <- "C:/Users/hyber/gym-dbms/R/raw_extract/"
  
  # Set last_run
  if(file.exists(paste0(file_path, "last_run_time.txt"))) {
    last_run <- as.POSIXct(readLines(paste0(file_path, "last_run_time.txt")), tz = "UTC")
  } else{
    last_run_path <- paste0(file_path, "last_run_time.txt")
    start_date <- ymd_hms("2000-01-01 00:00:01", tz = "UTC")
    last_run_time <- writeLines(as.character(start_date), last_run_path)
    last_run <- as.POSIXct(readLines(paste0(file_path, "last_run_time.txt")), tz = "UTC")
  }
  
  # Connecting to SQL database (raw data host)
  db_con_raw <- odbcConnect('ApexGym', uid = "fico", pwd = "Gym") 
  # Read data from tables
  raw_users <- sqlQuery(db_con_raw, "select * from Users")
  raw_visits <- sqlQuery(db_con_raw, "select * from Visits")
  raw_staff <- sqlQuery(db_con_raw, "select * from Staff")
  # Save into R
  saveRDS(raw_users, paste0(file_deposit, "raw.users.RDS"))
  saveRDS(raw_visits, paste0(file_deposit, "raw.visits.RDS"))
  saveRDS(raw_staff, paste0(file_deposit, "raw.staff.RDS"))
  # Disconnect from SQL
  odbcClose(db_con_raw)
  }

