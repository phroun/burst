
; Count from 0 to 9
main:
    movi r0, #0            ; Counter
    
loop:
    ; Print digit
    mov r1, r0
    movi r2, #48           ; ASCII '0'
    add r1, r1, r2         ; Convert to ASCII
    push r0                ; Save counter
    
    movi r0, #32           ; SYS_PUTCHAR
    syscall
    
    ; Print newline
    movi r1, #10
    syscall
    
    pop r0                 ; Restore counter
    inc r0
    movi r3, #10
    cmp r0, r3
    jlt loop
    
    halt
