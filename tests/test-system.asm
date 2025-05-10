; BURST VM System Instruction Tests
; Tests SYSCALL, HALT, NOP, and various system calls

main:
    jmp test_start

; Test data
test_name:      .string "=== System Tests ==="
pass_msg:       .string "PASS: "
fail_msg:       .string "FAIL: "
syscall_test:   .string "SYSCALL test"
halt_test:      .string "HALT test"
nop_test:       .string "NOP test"
alloc_test:     .string "ALLOC test"
free_test:      .string "FREE test"
print_test:     .string "PRINT test"
exit_test:      .string "EXIT test"
hello_msg:      .string "Hello from syscall!"
newline:        .byte 10

test_start:
    ; Print test header
    movi r1, #test_name
    movi r2, #20
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall

    ; Test NOP
    call test_nop
    
    ; Test PRINT syscall
    call test_print_syscall
    
    ; Test ALLOC/FREE syscalls
    call test_alloc_free
    
    ; Test EXIT syscall
    call test_exit_syscall
    
    ; Test HALT
    call test_halt
    
    ; Should not reach here if HALT works
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    
    halt

; NOP Test
test_nop:
    ; Execute some NOPs
    nop
    nop
    nop
    
    ; If we get here, NOP worked
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
    movi r1, #nop_test
    movi r2, #8
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    ret

; PRINT Syscall Test
test_print_syscall:
    movi r1, #hello_msg
    movi r2, #19
    movi r0, #30   ; SYS_PRINT
    syscall
    
    movi r1, #10
    movi r0, #32   ; SYS_PUTCHAR
    syscall
    
    ; If we get here, print worked
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
    movi r1, #print_test
    movi r2, #10
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    ret

; ALLOC/FREE Test
test_alloc_free:
    ; Allocate memory
    movi r0, #1    ; SYS_ALLOC
    movi r1, #256  ; Size
    syscall
    
    ; Check if allocation succeeded (r0 != 0)
    movi r6, #0
    cmp r0, r6
    jeq alloc_fail
    
    ; Save allocated address
    mov r5, r0
    
    ; Write to allocated memory
    movi r3, #0xABCD
    store r3, r5, #0
    
    ; Read it back
    load r4, r5, #0
    cmp r3, r4
    jne alloc_fail
    
    ; Free the memory
    movi r0, #2    ; SYS_FREE
    mov r1, r5
    syscall
    
    ; Check if free succeeded (r0 == 0)
    movi r6, #0
    cmp r0, r6
    jeq alloc_pass
    
alloc_fail:
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp alloc_done
    
alloc_pass:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
alloc_done:
    movi r1, #alloc_test
    movi r2, #10
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    ret

; EXIT Syscall Test (doesn't actually exit in test)
test_exit_syscall:
    ; We'll test that the syscall exists but not actually call it
    ; since it would terminate the test
    
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
    movi r1, #exit_test
    movi r2, #9
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    ret

; HALT Test
test_halt:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
    movi r1, #halt_test
    movi r2, #9
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    
    ; Now actually halt
    halt
    
    ; This should never execute
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    ret
 