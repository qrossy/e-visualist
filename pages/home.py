# package imports
import dash
from dash import html, dcc, callback, Input, Output

dash.register_page(
    __name__,
    path='/',
    redirect_from=['/home'],
    title='Home'
)

layout = html.Div(
    [
        html.H1('Home page!'),
        html.Div(id='content')
    ]
)

@callback(Output('content', 'children'), Input('radios', 'value'))
def home_radios(value):
    return f'You have selected {value}'
