run_model_1 <- function() {
  # Load libraries
  suppressPackageStartupMessages(library(dplyr))
  suppressPackageStartupMessages(library(RODBC))
  
  # Set file path
  file_path <- "C:/Users/hyber/gym-dbms/R/"
  file_deposit <- "C:/Users/hyber/gym-dbms/R/raw_extract/"
  
  # Read last_run
  last_run <- as.POSIXct(readLines(paste0(file_path, "last_run_time.txt")), tz = "UTC")
  # Read data from tables
  # Convert date data to character to enable filter below
  run <-as.character(last_run)
  # Filter raw_visit data by last run date to pick only new records
  visits <- readRDS(paste0(file_deposit, "raw.visits.RDS")) %>% 
    filter(VisitDate > run)
  users <- readRDS(paste0(file_deposit, "raw.users.RDS"))
  staff <- readRDS(paste0(file_deposit, "raw.staff.RDS"))
  # Join tables
  df <- visits %>% 
    left_join(select(users, Id, FullName, Gender, Membership), 
              by = c("UserId" = "Id")) %>% 
    left_join(select(staff, Id, FullName), 
              by = c('StaffId' = 'Id'))
  # Clean column names
  df <- df %>% 
    rename('Member' = FullName.x,
           'Staff' = FullName.y) %>% 
    select(6:8, 5, 4, 9) %>% 
    mutate(Time_stamp = as.character(Sys.time()))
  # Save df
  saveRDS(df, paste0(file_path, "df.RDS"))
}
