; Calculate Fibonacci numbers
main:
    movi r0, #0            ; First Fibonacci number
    movi r1, #1            ; Second Fibonacci number
    movi r2, #10           ; How many to calculate
    movi r3, #0            ; Counter
    
fib_loop:
    ; Print current number
    push r0
    push r1
    push r2
    push r3
    
    ; Print the Fibonacci number
    mov r5, r0             ; Current Fibonacci number to r5
    movi r6, #48           ; ASCII '0'
    add r5, r5, r6         ; Convert to ASCII
    
    movi r0, #32           ; SYS_PUTCHAR
    mov r1, r5             ; Character to print
    syscall
    
    movi r1, #10           ; Newline
    movi r0, #32           ; SYS_PUTCHAR
    syscall
    
    pop r3
    pop r2
    pop r1
    pop r0
    
    ; Calculate next Fibonacci number
    mov r4, r1             ; Save current in temp
    add r1, r0, r1         ; Next = current + previous
    mov r0, r4             ; Previous = old current
    
    ; Increment counter and check loop
    inc r3
    cmp r3, r2
    jlt fib_loop
    
    halt
