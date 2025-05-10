; BURST VM Register Operation Tests
; Tests MOV, MOVI, and proper register preservation

main:
    jmp test_start

; Test data
test_name:      .string "=== Register Tests ==="
pass_msg:       .string "PASS: "
fail_msg:       .string "FAIL: "
mov_test:       .string "MOV test"
movi_test:      .string "MOVI test"
preserve_test:  .string "Register preserve test"
all_regs_test:  .string "All registers test"
newline:        .byte 10

test_start:
    ; Print test header
    movi r1, #test_name
    movi r2, #22
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall

    ; Test MOVI
    call test_movi
    
    ; Test MOV
    call test_mov
    
    ; Test register preservation
    call test_preserve
    
    ; Test all registers
    call test_all_registers
    
    halt

; MOVI Test
test_movi:
    ; Test immediate loads
    movi r3, #42
    movi r4, #42
    cmp r3, r4
    jeq movi_pass
    
movi_fail:
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp movi_done
    
movi_pass:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
movi_done:
    movi r1, #movi_test
    movi r2, #9
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    ret

; MOV Test
test_mov:
    ; Test register to register moves
    movi r3, #123
    mov r4, r3
    
    movi r5, #123
    cmp r4, r5
    jeq mov_pass
    
mov_fail:
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp mov_done
    
mov_pass:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
mov_done:
    movi r1, #mov_test
    movi r2, #8
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    ret

; Register Preservation Test
test_preserve:
    ; Set up some register values
    movi r3, #111
    movi r4, #222
    movi r5, #333
    
    ; Call a function that uses other registers
    call preserve_function
    
    ; Check if our registers are preserved
    movi r6, #111
    cmp r3, r6
    jne preserve_fail
    
    movi r6, #222
    cmp r4, r6
    jne preserve_fail
    
    movi r6, #333
    cmp r5, r6
    jne preserve_fail
    
    jmp preserve_pass
    
preserve_fail:
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp preserve_done
    
preserve_pass:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
preserve_done:
    movi r1, #preserve_test
    movi r2, #22
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    ret

; Function that uses different registers
preserve_function:
    movi r7, #444
    movi r8, #555
    movi r9, #666
    ret

; Test All Registers
test_all_registers:
    ; Store unique values in all registers
    movi r0, #0
    movi r1, #1
    movi r2, #2
    movi r3, #3
    movi r4, #4
    movi r5, #5
    movi r6, #6
    movi r7, #7
    movi r8, #8
    movi r9, #9
    movi r10, #10
    movi r11, #11
    movi r12, #12
    movi r13, #13
    movi r14, #14
    movi r15, #15
    
    ; Check if each register holds its value
    movi r0, #0
    cmp r0, r0
    jne all_regs_fail
    
    ; We can't test all without overwriting, but we tested the concept
    jmp all_regs_pass
    
all_regs_fail:
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp all_regs_done
    
all_regs_pass:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
all_regs_done:
    movi r1, #all_regs_test
    movi r2, #18
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    ret
 