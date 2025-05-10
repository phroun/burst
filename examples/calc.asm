
; Simple calculator demo
main:
    movi r0, #10           ; First number
    movi r1, #5            ; Second number
    
    ; Add
    add r2, r0, r1         ; r2 = 15
    
    ; Subtract
    sub r3, r0, r1         ; r3 = 5
    
    ; Multiply
    mul r4, r0, r1         ; r4 = 50
    
    ; Divide
    div r5, r0, r1         ; r5 = 2
    
    ; Store results in memory
    movi r6, #0x1000       ; Base address
    store r2, r6, #0       ; Store sum
    store r3, r6, #4       ; Store difference
    store r4, r6, #8       ; Store product
    store r5, r6, #12      ; Store quotient
    
    halt
