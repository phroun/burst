; === hello.asm ===
; Simple hello world program
main:
    movi r1, #hello_str     ; Load string address
    movi r2, #13           ; String length
    movi r0, #30           ; SYS_PRINT
    syscall
    
    movi r0, #20           ; SYS_EXIT
    movi r1, #0            ; Exit code 0
    syscall
    
    halt

hello_str:
    .string "Hello, BURST!"
