; BURST VM Control Flow Instruction Tests
; Tests JMP, JZ, JNZ, JEQ, JNE, JLT, JGT, JLE, JGE, CALL, RET, CMP

main:
    jmp test_start

; Test data
test_name:      .string "=== Control Flow Tests ==="
pass_msg:       .string "PASS: "
fail_msg:       .string "FAIL: "
jmp_test:       .string "JMP test"
jz_test:        .string "JZ test"
jnz_test:       .string "JNZ test"
jeq_test:       .string "JEQ test"
jne_test:       .string "JNE test"
jlt_test:       .string "JLT test"
jgt_test:       .string "JGT test"
jle_test:       .string "JLE test"
jge_test:       .string "JGE test"
call_test:      .string "CALL test"
cmp_test:       .string "CMP test"
newline:        .byte 10

test_start:
    ; Print test header
    movi r1, #test_name
    movi r2, #26
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall

    ; Test JMP
    call test_jmp
    
    ; Test JZ/JNZ
    call test_jz_jnz
    
    ; Test JEQ/JNE
    call test_jeq_jne
    
    ; Test JLT/JGT
    call test_jlt_jgt
    
    ; Test JLE/JGE
    call test_jle_jge
    
    ; Test CALL/RET
    call test_call_ret
    
    ; Test CMP
    call test_cmp
    
    halt

; JMP Test
test_jmp:
    ; Jump over failure code
    jmp jmp_success
    
    ; This should not be executed
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp jmp_done
    
jmp_success:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
jmp_done:
    movi r1, #jmp_test
    movi r2, #8
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    ret

; JZ/JNZ Test
test_jz_jnz:
    ; Test JZ - should jump when zero
    movi r3, #0
    cmp r3, r3  ; Sets zero flag
    jz jz_success
    
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp jz_done
    
jz_success:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
jz_done:
    movi r1, #jz_test
    movi r2, #7
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    
    ; Test JNZ - should jump when not zero
    movi r3, #5
    movi r4, #3
    cmp r3, r4  ; Not equal, so not zero
    jnz jnz_success
    
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp jnz_done
    
jnz_success:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
jnz_done:
    movi r1, #jnz_test
    movi r2, #8
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    ret

; JEQ/JNE Test
test_jeq_jne:
    ; Test JEQ - should jump when equal
    movi r3, #42
    movi r4, #42
    cmp r3, r4
    jeq jeq_success
    
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp jeq_done
    
jeq_success:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
jeq_done:
    movi r1, #jeq_test
    movi r2, #8
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    
    ; Test JNE - should jump when not equal
    movi r3, #17
    movi r4, #42
    cmp r3, r4
    jne jne_success
    
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp jne_done
    
jne_success:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
jne_done:
    movi r1, #jne_test
    movi r2, #8
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    ret

; JLT/JGT Test
test_jlt_jgt:
    ; Test JLT - should jump when less than
    movi r3, #5
    movi r4, #10
    cmp r3, r4
    jlt jlt_success
    
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp jlt_done
    
jlt_success:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
jlt_done:
    movi r1, #jlt_test
    movi r2, #8
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    
    ; Test JGT - should jump when greater than
    movi r3, #15
    movi r4, #10
    cmp r3, r4
    jgt jgt_success
    
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp jgt_done
    
jgt_success:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
jgt_done:
    movi r1, #jgt_test
    movi r2, #8
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    ret

; JLE/JGE Test
test_jle_jge:
    ; Test JLE - should jump when less or equal
    movi r3, #10
    movi r4, #10
    cmp r3, r4
    jle jle_success
    
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp jle_done
    
jle_success:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
jle_done:
    movi r1, #jle_test
    movi r2, #8
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    
    ; Test JGE - should jump when greater or equal
    movi r3, #10
    movi r4, #10
    cmp r3, r4
    jge jge_success
    
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp jge_done
    
jge_success:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
jge_done:
    movi r1, #jge_test
    movi r2, #8
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    ret

; CALL/RET Test
test_call_ret:
    ; Call a function
    movi r3, #99  ; Set a value to check later
    call test_function
    
    ; Check if we returned correctly and r3 still has its value
    movi r4, #99
    cmp r3, r4
    jeq call_ret_success
    
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp call_ret_done
    
call_ret_success:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    
call_ret_done:
    movi r1, #call_test
    movi r2, #9
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    ret

; Test function for CALL/RET
test_function:
    ; Do something simple
    movi r5, #123
    movi r6, #456
    add r7, r5, r6
    ; Return
    ret

; CMP Test
test_cmp:
    ; Test various comparisons
    movi r3, #5
    movi r4, #5
    cmp r3, r4
    jeq cmp_equal_ok
    jmp cmp_fail
    
cmp_equal_ok:
    movi r3, #10
    movi r4, #5
    cmp r3, r4
    jgt cmp_greater_ok
    jmp cmp_fail
    
cmp_greater_ok:
    movi r3, #5
    movi r4, #10
    cmp r3, r4
    jlt cmp_less_ok
    jmp cmp_fail
    
cmp_less_ok:
    movi r1, #pass_msg
    movi r2, #6
    movi r0, #30
    syscall
    jmp cmp_done
    
cmp_fail:
    movi r1, #fail_msg
    movi r2, #6
    movi r0, #30
    syscall
    
cmp_done:
    movi r1, #cmp_test
    movi r2, #8
    movi r0, #30
    syscall
    
    movi r1, #10
    movi r0, #32
    syscall
    ret
 