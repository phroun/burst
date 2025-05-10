; Simple output test to debug VM output
main:
    ; Print a simple message
    movi r1, #msg
    movi r2, #13
    movi r0, #30    ; SYS_PRINT
    syscall
    
    ; Print a single character
    movi r1, #65    ; 'A'
    movi r0, #32    ; SYS_PUTCHAR
    syscall
    
    halt
    
msg: .string "Test output: "
