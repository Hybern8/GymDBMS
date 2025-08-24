# Run full pipeline
apex_run <- function() {
  
  # Set file path
  file_path <- "C:/Users/hyber/gym-dbms/R/"
  
  # Get script sources
  source(paste0(file_path, "initiate.R"))
  source(paste0(file_path, "transformer.R"))
  source(paste0(file_path, "closure.R"))
  
  print('Starting connection to raw database server...')
  start_task()
  print('Closing connection to raw database server...')
  # run transformation
  print('Transformation step started...')
  run_model_1()
  print('Transformation step completed...')
  # append to Transformed database
  print('Starting connection to transformed database server...')
  save_transformed_data()
  print('Database updated successfully!')
  print('Closing connection to transformed database server...')
    # Save last_run
  last_run_file <- paste0(file_path, "last_run_time.txt")
  writeLines(as.character(Sys.time()), last_run_file)
  print("'last_run' saved!")
  
  print('Data pipeline closed')
}

apex_run()
