save_transformed_data <- function() {
  # Load libraries
  suppressPackageStartupMessages(library(RODBC))
  suppressPackageStartupMessages(library(lubridate))
  
  # Set file path
  file_path <- "C:/Users/hyber/gym-dbms/R/"
  
  # read df in
  df <- readRDS(paste0(file_path, "df.RDS"))
  # Converting to the right data types to SQL 
  data_types <- sapply(df, function(x) {
    if(is.character(x)) return('varchar(100)')
    if(is.Date(x)) return('date')
    if(is.numeric(x)) return('float')
    if(inherits(x, "POSIXct")) return('datetime2')
  })
  db_con_transformed <- odbcConnect('ApexGym', uid = "fico", pwd = "Gym")
  sqlSave(db_con_transformed, 
          df, 
          tablename = 'Transformed', 
          rownames = F,
          append = T,
          verbose = F,
          varTypes = data_types)
  odbcClose(db_con_transformed)
}
