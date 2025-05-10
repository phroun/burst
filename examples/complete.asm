; BURST VM Complete Example Program
; Demonstrates all major features of the VM

main:
    jmp start

; Data section
msg_welcome:    .string "BURST VM Demo\n"
msg_calc:       .string "Calculations:\n"
msg_memory:     .string "Memory test: "
msg_stack:      .string "Stack test: "
msg_done:       .string "\nDone!\n"
newline:        .byte 10
numbers:        .word 42, 17, 255

start:
    ; Print welcome message
    movi r1, #msg_welcome
    movi r2, #14
    movi r0, #30        ; SYS_PRINT
    syscall
    
    ; Arithmetic operations
    movi r1, #msg_calc
    movi r2, #14
    syscall
    
    movi r3, #42
    movi r4, #17
    
    ; Add
    add r5, r3, r4      ; r5 = 42 + 17 = 59
    call print_number
    call print_newline
    
    ; Multiply
    mul r5, r3, r4      ; r5 = 42 * 17 = 714
    call print_number
    call print_newline
    
    ; Memory test
    movi r1, #msg_memory
    movi r2, #13
    movi r0, #30
    syscall
    
    ; Allocate memory
    movi r0, #1         ; SYS_ALLOC
    movi r1, #100
    syscall
    mov r6, r0          ; Save allocated address
    
    ; Store and load
    movi r7, #0xDEADBEEF
    store r7, r6, #0
    load r8, r6, #0
    
    ; Compare
    cmp r7, r8
    jeq memory_ok
    jmp memory_fail
    
memory_ok:
    movi r1, #79        ; 'O'
    movi r0, #32
    syscall
    movi r1, #75        ; 'K'
    syscall
    jmp memory_done
    
memory_fail:
    movi r1, #70        ; 'F'
    movi r0, #32
    syscall
    movi r1, #65        ; 'A'
    syscall
    movi r1, #73        ; 'I'
    syscall
    movi r1, #76        ; 'L'
    syscall
    
memory_done:
    call print_newline
    
    ; Free memory
    movi r0, #2         ; SYS_FREE
    mov r1, r6
    syscall
    
    ; Stack test
    movi r1, #msg_stack
    movi r2, #12
    movi r0, #30
    syscall
    
    ; Test function call with stack
    movi r9, #123
    movi r10, #456
    push r9
    push r10
    call add_numbers
    ; Result in r0
    mov r5, r0
    call print_number
    call print_newline
    
    ; Loop test - print 0-4
    movi r11, #0
loop:
    mov r5, r11
    call print_number
    movi r1, #32        ; Space
    movi r0, #32
    syscall
    
    inc r11
    movi r12, #5
    cmp r11, r12
    jlt loop
    
    ; Done
    movi r1, #msg_done
    movi r2, #7
    movi r0, #30
    syscall
    
    halt

; Functions

; Print number in r5 (simplified - only handles single digit)
print_number:
    push r0
    push r1
    
    mov r1, r5
    movi r2, #48        ; ASCII '0'
    add r1, r1, r2
    movi r0, #32        ; SYS_PUTCHAR
    syscall
    
    pop r1
    pop r0
    ret

; Print newline
print_newline:
    push r0
    push r1
    
    movi r1, #10
    movi r0, #32        ; SYS_PUTCHAR
    syscall
    
    pop r1
    pop r0
    ret

; Add two numbers from stack
add_numbers:
    pop r1              ; Return address
    pop r2              ; First number
    pop r3              ; Second number
    
    add r0, r2, r3      ; Result in r0
    
    push r1             ; Restore return address
    ret
 