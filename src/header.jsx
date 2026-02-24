import React from 'react';
import {Nav, Navbar, OverlayTrigger, Tooltip} from 'react-bootstrap';
import {FaInfoCircle, FaQq, FaReact} from 'react-icons/fa';

export function Header() {
    const version = import.meta.env.VITE_APP_VERSION;
    const renderTooltip = (props) => (
        <Tooltip id="qq-tooltip" {...props}>
            原作者QQ: 653524123<br/>
            原QQ群: 816367922<br/>
            {/* 维护者QQ: 请在此填写 */}<br/>
        </Tooltip>
    );
    return (
        <Navbar className="px-3 text-nowrap" bg="light" expand="lg">
            <Navbar.Brand href="#" className="d-inline-flex align-items-baseline">
                <FaReact className="me-2 align-self-center"/>
                <span className="me-1">戴森球计划量化计算器</span>
                <span className="text-muted ssmall">v{version}</span>
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="navbarNav"/>
            <Navbar.Collapse id="navbarNav">
                <Nav className="me-auto align-items-center">
                    {/* 维护者信息 */}
                    <Nav.Link href="#" className="fw-bold">本项目仓库</Nav.Link>
                    
                    <div className="vr mx-2 h-50 d-none d-lg-block"></div>
                    <hr className="d-lg-none my-1"/>

                    {/* 原作者信息 */}
                    <Nav.Link href="https://github.com/DSPCalculator/dsp-calc" className="text-secondary">原开源仓库</Nav.Link>
                    <Nav.Link href="https://www.bilibili.com/read/readlist/rl630834" target="_blank" className="text-secondary">逻辑原理</Nav.Link>
                    <Nav.Link href="https://space.bilibili.com/16051534" className="text-secondary">原作者</Nav.Link>
                </Nav>
                <Nav>
                    <OverlayTrigger
                        placement="bottom"
                        delay={{show: 250, hide: 400}}
                        overlay={renderTooltip}
                    >
                        <Nav.Link href="#" className="d-flex align-items-center">
                            <FaQq className="me-1"/>QQ
                        </Nav.Link>
                    </OverlayTrigger>
                </Nav>
                <span className="navbar-text ms-auto small">
                    <FaInfoCircle className="me-1"/> 若无法加载，尝试切换浏览器为Chrome/Edge
                </span>
            </Navbar.Collapse>
        </Navbar>
    );
}