CANOPY_CLASSES = (
    (2, 3, '2 a menos de 3 m', '#bbd878'),
    (3, 5, '3 a menos de 5 m', '#5da353'),
    (5, 256, '5 m ou mais', '#1a623a'),
)


def hex_rgb(color):
    return [int(color[start:start + 2], 16) for start in (1, 3, 5)]
