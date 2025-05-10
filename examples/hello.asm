
; Simple hello world program
main:
    jmp start
    
hello_str:
    .string "Hello, BURST World!"
    
start:
    movi r1, #hello_str    ; String address
    movi r2, #19           ; String length  
    movi r0, #30           ; SYS_PRINT
    syscall
    
    movi r0, #20           ; SYS_EXIT
    movi r1, #0            ; Exit code
    syscall
    halt
